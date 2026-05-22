import { BigQuery } from "@google-cloud/bigquery";

export function getBigQueryClient(): BigQuery {
  const projectId = process.env.BIGQUERY_PROJECT_ID;
  const credsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (credsJson && credsJson.trim()) {
    try {
      const credentials = JSON.parse(credsJson);
      return new BigQuery({ projectId, credentials });
    } catch (err) {
      console.error(
        "GOOGLE_APPLICATION_CREDENTIALS_JSON is set but failed to parse. Falling back to default credentials. Error:",
        err
      );
    }
  }
  return new BigQuery({ projectId });
}
