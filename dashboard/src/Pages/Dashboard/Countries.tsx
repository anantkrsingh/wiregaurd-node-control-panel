import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Country } from "@/types/country"
import { createCountry, listCountries } from "@/utils/countries"
import { X } from "lucide-react"

function Countries() {
  const [countries, setCountries] = useState<Country[]>([])
  const [name, setName] = useState("")
  const [flagUrl, setFlagUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

  async function refresh() {
    try {
      const data = await listCountries()
      setCountries(data.countries)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load countries")
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  async function onAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (loading) return
    const nameTrim = name.trim()
    if (!nameTrim) {
      toast.error("Country name is required")
      return
    }
    setLoading(true)
    try {
      await createCountry(nameTrim, flagUrl.trim() || undefined)
      toast.success("Country created")
      setName("")
      setFlagUrl("")
      setAddOpen(false)
      await refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add country")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xl font-semibold">Countries</div>
          <div className="text-sm text-muted-foreground">
            Manage countries for server locations. Add a country name and optional flag URL, then select it when adding a server.
          </div>
        </div>
        <Button type="button" onClick={() => setAddOpen(true)}>
          Add country
        </Button>
      </div>

      {addOpen && (
        <div
          className="fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
          aria-label="Add country"
          onKeyDown={(e) => e.key === "Escape" && setAddOpen(false)}
        >
          <div className="fixed inset-0 bg-black/50" onClick={() => setAddOpen(false)} />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Card className="relative w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <CardHeader className="pr-12">
                <CardTitle>Add country</CardTitle>
                <CardDescription>
                  Add a country name and optional flag image URL. This country can then be selected when adding a server.
                </CardDescription>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-3 top-3"
                  aria-label="Close"
                  onClick={() => setAddOpen(false)}
                >
                  <X className="size-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={onAdd}>
                  <div className="space-y-2">
                    <Label htmlFor="country-name">Country name</Label>
                    <Input
                      id="country-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. India, United States"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="flag-url">Flag URL (optional)</Label>
                    <Input
                      id="flag-url"
                      value={flagUrl}
                      onChange={(e) => setFlagUrl(e.target.value)}
                      placeholder="https://example.com/flag.png"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" disabled={loading}>
                      {loading ? "Adding..." : "Add country"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All countries</CardTitle>
          <CardDescription>Select one of these when adding a server.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!countries.length ? (
            <div className="text-sm text-muted-foreground">No countries yet. Add one to use when adding servers.</div>
          ) : (
            <div className="space-y-2">
              {countries.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 rounded-md border p-3"
                >
                  {c.flag_url ? (
                    <img src={c.flag_url} alt="" className="h-6 w-auto object-contain" />
                  ) : (
                    <div className="h-6 w-8 rounded bg-muted" aria-hidden />
                  )}
                  <span className="font-medium">{c.name}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default Countries
