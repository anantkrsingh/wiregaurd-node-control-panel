import { fileDb } from "../index";

export type CountryRow = {
  id: number;
  name: string;
  flag_url: string | null;
  created_at: string;
};

export const listCountriesStmt = () => {
  return fileDb.prepare("SELECT id, name, flag_url, created_at FROM countries ORDER BY name ASC");
};

export const insertCountryStmt = () => {
  return fileDb.prepare(
    "INSERT INTO countries (name, flag_url, created_at) VALUES (?, ?, ?)"
  );
};

export const getCountryByIdStmt = () => {
  return fileDb.prepare("SELECT * FROM countries WHERE id = ?");
};
