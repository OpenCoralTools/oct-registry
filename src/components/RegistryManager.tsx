import { useStore } from '@nanostores/react';
import { AlertCircle, Check, Loader2, Plus } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { z } from 'zod';
import { GitHubService } from '../lib/github';
import { loadRegistrySchema } from '../schemas/registry';
import { $token, $user } from '../stores/authStore';

type RegistryName = 'organizations' | 'species' | 'genets';

interface RegistryManagerProps {
  name: RegistryName;
  initialData: any[];
}

export default function RegistryManager({ name, initialData }: RegistryManagerProps) {
  const token = useStore($token);
  const user = useStore($user);

  const safeInitialData = Array.isArray(initialData)
    ? initialData
    : (initialData as any)?.default && Array.isArray((initialData as any).default)
      ? (initialData as any).default
      : [];

  const [data, setData] = useState<any[]>(safeInitialData);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [species, setSpecies] = useState<any[]>([]);

  // State for dynamic schema
  const [zodSchema, setZodSchema] = useState<z.ZodObject<any> | null>(null);
  const [schemaVersion, setSchemaVersion] = useState<string>('1.0.0');

  const [loading, setLoading] = useState(false);
  const [schemaLoading, setSchemaLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editItem, setEditItem] = useState<any>(null); // null = new item

  // Load Schema
  useEffect(() => {
    let mounted = true;
    const fetchSchema = async () => {
      setSchemaLoading(true);
      try {
        const { schema, version } = await loadRegistrySchema(name);
        if (mounted) {
          setZodSchema(schema);
          setSchemaVersion(version);
        }
      } catch (e) {
        console.error(e);
        if (mounted) setError('Failed to load validation schema.');
      } finally {
        if (mounted) setSchemaLoading(false);
      }
    };
    fetchSchema();
    return () => { mounted = false; };
  }, [name]);


  // Refresh data on mount or when token changes
  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token, name]);

  const loadData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const service = new GitHubService(token);

      const file = await service.getFileContent(`data/${name}.json`);
      const parsed = JSON.parse(file.content);
      if (Array.isArray(parsed)) {
        setData(parsed);
        setError(null);
      } else {
        throw new Error('Data from GitHub is not an array');
      }

      if (name === 'genets') {
        try {
          const orgsFile = await service.getFileContent('data/organizations.json');
          setOrganizations(JSON.parse(orgsFile.content));

          const speciesFile = await service.getFileContent('data/species.json');
          setSpecies(JSON.parse(speciesFile.content));
        } catch (e) {
          console.warn('Failed to load related data for validation', e);
        }
      }

    } catch (err: any) {
      console.error(err);
      if (err.status === 404) {
        console.log('File not found on GitHub, using local data');
        setError(null);
      } else {
        setError('Failed to fetch latest data from GitHub. Showing local data.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (formData: any) => {
    if (!token) {
      setError('You must be logged in to save.');
      return;
    }

    if (!zodSchema) {
      setError('Schema validation not loaded.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Inject schema version before validation
      const itemToValidate = {
        ...formData,
        _schemaVersion: schemaVersion
      };

      // Validate schema
      const validItem = zodSchema.parse(itemToValidate);

      // Custom Validation: Check Foreign Keys for Genets
      if (name === 'genets') {
        if (organizations.length > 0) {
          const orgExists = organizations.some(o => o.id === validItem.orgId);
          if (!orgExists) throw new Error(`Organization ID "${validItem.orgId}" not found.`);
        }
        if (species.length > 0) {
          const speciesExists = species.some(s => s.code === validItem.speciesCode);
          if (!speciesExists) throw new Error(`Species Code "${validItem.speciesCode}" not found.`);
        }
      }

      let newData = [...data];
      const idField = name === 'species' ? 'code' : 'id';

      if (editItem) {
        const index = newData.findIndex(item => item[idField] === editItem[idField]);
        if (index !== -1) {
          newData[index] = validItem;
        } else {
          newData.push(validItem);
        }
      } else {
        if (newData.some(item => item[idField] === validItem[idField])) {
          throw new Error(`Item with ${idField} "${validItem[idField]}" already exists.`);
        }
        newData.push(validItem);
      }

      const service = new GitHubService(token);

      let sha: string | undefined;
      try {
        const currentFile = await service.getFileContent(`data/${name}.json`);
        sha = currentFile.sha;
      } catch (e: any) {
        if (e.status === 404) {
          // File doesn't exist, will be created. SHA undefined.
        } else {
          throw e;
        }
      }

      const content = JSON.stringify(newData, null, 2);
      const message = `Update ${name} registry: ${editItem ? 'Edit' : 'Add'} ${validItem[idField]}`;

      await service.updateFileDirectly(
        `data/${name}.json`,
        content,
        message,
        sha || ''
      );

      setData(newData);
      setSuccess('Changes saved successfully!');
      setIsEditing(false);
      setEditItem(null);

      setTimeout(() => setSuccess(null), 3000);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to save changes.');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (item: any) => {
    setEditItem(item);
    setIsEditing(true);
  };

  const startNew = () => {
    setEditItem(null);
    setIsEditing(true);
  };

  const displayData = Array.isArray(data) ? data : [];

  const fieldConfig: Record<string, { type: 'select', options: { label: string, value: string }[] }> = {};

  if (name === 'genets' && organizations.length > 0 && species.length > 0) {
    fieldConfig['orgId'] = {
      type: 'select',
      options: organizations.map(o => ({ label: `${o.name} (${o.id})`, value: o.id }))
    };
    fieldConfig['speciesCode'] = {
      type: 'select',
      options: species.map(s => {
        const label = s.commonName
          ? `${s.commonName} (${s.code})`
          : `${s.genus} ${s.specific_epithet} (${s.code})`;
        return { label, value: s.code };
      })
    };
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold capitalize">{name} Registry</h2>
        <div className="flex gap-2">
          <button
            onClick={loadData}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded"
            title="Refresh"
          >
            <Loader2 className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {user && (
            <button
              onClick={startNew}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              disabled={schemaLoading || !zodSchema}
            >
              <Plus className="w-4 h-4" /> Add New
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 text-green-700 p-4 rounded flex items-center gap-2">
          <Check className="w-5 h-5" />
          {success}
        </div>
      )}

      {schemaLoading && (
        <div className="text-center py-8 text-slate-500">Loading schema definitions...</div>
      )}

      {!schemaLoading && isEditing && zodSchema ? (
        <div className="bg-white p-6 rounded shadow border">
          <h3 className="text-lg font-bold mb-4">{editItem ? 'Edit Item' : 'New Item'}</h3>
          <AutoForm
            schema={zodSchema}
            initialValues={editItem || {}}
            onSubmit={handleSave}
            onCancel={() => setIsEditing(false)}
            loading={loading}
            fieldConfig={fieldConfig}
          />
        </div>
      ) : !schemaLoading && (
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                {displayData.length > 0 && Object.keys(displayData[0]).map(key => {
                  // Hide _schemaVersion column? Optional
                  if (key === '_schemaVersion') return null;
                  return <th key={key} className="p-4 font-semibold text-slate-600 capitalize">{key}</th>
                })}
                {user && <th className="p-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {displayData.map((item, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  {Object.keys(item).map(key => {
                    if (key === '_schemaVersion') return null;
                    return <td key={key} className="p-4">{item[key]}</td>
                  })}
                  {user && (
                    <td className="p-4 text-right">
                      <button
                        onClick={() => startEdit(item)}
                        className="text-blue-600 hover:underline"
                      >
                        Edit
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {displayData.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500">No data found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AutoForm({ schema, initialValues, onSubmit, onCancel, loading, fieldConfig = {} }: any) {
  // With dynamic zod schema, we need to inspect it differently depending on library output
  // zod-from-json-schema returns a ZodObject
  // @ts-ignore
  const shape = schema.shape;
  const keys = Object.keys(shape);
  const [values, setValues] = useState(initialValues);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {keys.map(key => {
        // Hide _schemaVersion from form
        if (key === '_schemaVersion') return null;

        const fieldSchema = shape[key];
        const isOptional = fieldSchema.isOptional();
        const config = fieldConfig[key];

        return (
          <div key={key}>
            <label className="block text-sm font-medium mb-1 capitalize">
              {key} {isOptional ? <span className="text-slate-400 font-normal">(optional)</span> : <span className="text-red-500">*</span>}
            </label>

            {config?.type === 'select' ? (
              <select
                className="w-full border rounded p-2 bg-white"
                value={values[key] || ''}
                onChange={e => setValues({ ...values, [key]: e.target.value })}
                required={!isOptional}
              >
                <option value="">Select...</option>
                {config.options.map((opt: any) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="w-full border rounded p-2"
                value={values[key] || ''}
                onChange={e => setValues({ ...values, [key]: e.target.value })}
                required={!isOptional}
              />
            )}
          </div>
        );
      })}
      <div className="flex gap-4 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          {loading && <Loader2 className="animate-spin w-4 h-4" />}
          Save Changes
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
