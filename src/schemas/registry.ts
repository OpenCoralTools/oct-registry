import { z } from 'zod';
import { convertJsonSchemaToZod } from 'zod-from-json-schema';

export interface Organization {
  id: string;
  name: string;
  contact?: string;
  website?: string;
}

export interface Species {
  code: string;
  genus: string;
  specificEpithet: string;
  commonName?: string;
}

export interface Genet {
  id: string;
  orgId: string;
  speciesCode: string;
  notes?: string;
}

// Function to fetch and parse schemas at runtime
export async function loadRegistrySchema(registryName: string): Promise<{ schema: z.ZodObject<any>, version: string }> {
  try {
    const baseUrl = import.meta.env.BASE_URL.endsWith('/')
      ? import.meta.env.BASE_URL
      : `${import.meta.env.BASE_URL}/`;

    const response = await fetch(`${baseUrl}schemas/${registryName}.json`);
    if (!response.ok) {
      throw new Error(`Failed to load schema for ${registryName}`);
    }
    const jsonSchema = await response.json();

    // Extract version from JSON schema
    const version = jsonSchema.version || 'unknown';

    return {
      schema: convertJsonSchemaToZod(jsonSchema) as unknown as z.ZodObject<any>,
      version
    };
  } catch (error) {
    console.error(`Error loading schema for ${registryName}:`, error);
    throw error;
  }
}
