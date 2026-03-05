import api from "@/api/axios";
import { AxiosError } from "axios";
import type { Country } from "@/types/country";

export async function listCountries() {
  try {
    const response = await api.get<{ countries: Country[] }>("/countries");
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new Error(error.response?.data?.message || "No Response from server");
    }
    throw new Error("Network Error");
  }
}

export async function createCountry(name: string, flagUrl?: string) {
  try {
    const response = await api.post<{
      message: string;
      country: Country;
    }>("/countries", { name, flag_url: flagUrl ?? "" });
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new Error(error.response?.data?.message || "No Response from server");
    }
    throw new Error("Network Error");
  }
}
