import { Request, Response } from "express";
import {
  listCountriesStmt,
  insertCountryStmt,
  updateCountryStmt,
  type CountryRow,
} from "../db/query/countries";

export async function listCountries(req: Request, res: Response) {
  try {
    const rows = listCountriesStmt().all() as CountryRow[];
    return res.status(200).json({ countries: rows });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function createCountry(req: Request, res: Response) {
  try {
    const name = String(req.body?.name ?? "").trim();
    const flagUrl = req.body?.flag_url != null ? String(req.body.flag_url).trim() : "";

    if (!name) return res.status(400).json({ message: "Country name is required" });

    const createdAt = new Date().toISOString();
    const result = insertCountryStmt().run(name, flagUrl || null, createdAt) as unknown as {
      lastInsertRowid: number | bigint;
    };
    const id =
      typeof result?.lastInsertRowid === "bigint"
        ? Number(result.lastInsertRowid)
        : (result?.lastInsertRowid as number);

    return res.status(201).json({
      message: "Country created",
      country: { id, name, flag_url: flagUrl || null, created_at: createdAt },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function updateCountry(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const name = String(req.body?.name ?? "").trim();
    const flagUrl = req.body?.flag_url != null ? String(req.body.flag_url).trim() : "";

    if (!id || isNaN(id)) return res.status(400).json({ message: "Invalid country ID" });
    if (!name) return res.status(400).json({ message: "Country name is required" });

    updateCountryStmt().run(name, flagUrl || null, id);

    return res.status(200).json({
      message: "Country updated",
      country: { id, name, flag_url: flagUrl || null },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
