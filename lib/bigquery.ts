import { BigQuery } from "@google-cloud/bigquery";

export function getBigQueryClient(): BigQuery {
  const projectId = process.env.BIGQUERY_PROJECT_ID;
  const credsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (credsJson) {
    const credentials = JSON.parse(credsJson);
    return new BigQuery({ projectId, credentials });
  }
  return new BigQuery({ projectId });
}
