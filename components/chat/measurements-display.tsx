"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Home, 
  Layers, 
  Square, 
  Ruler, 
  Grid3X3,
  DoorOpen,
  CornerDownRight
} from "lucide-react"

interface MeasurementsDisplayProps {
  measurements: Record<string, unknown>
  jobName: string
  address: string
}

// Helper to format numbers
function formatNumber(value: unknown, unit: string = ""): string {
  if (value === null || value === undefined) return "N/A"
  if (typeof value === "number") {
    const formatted = value % 1 === 0 ? value.toString() : value.toFixed(2)
    return unit ? `${formatted} ${unit}` : formatted
  }
  return String(value)
}

// Helper to safely get nested values
function getNestedValue(obj: unknown, path: string): unknown {
  const keys = path.split(".")
  let current = obj
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== "object") {
      return undefined
    }
    current = (current as Record<string, unknown>)[key]
  }
  return current
}

export function MeasurementsDisplay({ measurements, jobName, address }: MeasurementsDisplayProps) {
  const summary = getNestedValue(measurements, "summary") as Record<string, unknown> | undefined
  const roof = (summary?.roof || getNestedValue(measurements, "roof")) as Record<string, unknown> | undefined
  const area = (summary?.area || getNestedValue(measurements, "area")) as Record<string, unknown> | undefined
  const trim = (summary?.trim || getNestedValue(measurements, "trim")) as Record<string, unknown> | undefined
  const openings = (summary?.openings || getNestedValue(measurements, "openings")) as Record<string, unknown> | undefined
  const roofline = (summary?.roofline || getNestedValue(measurements, "roofline")) as Record<string, unknown> | undefined
  const corners = (summary?.corners || getNestedValue(measurements, "corners")) as Record<string, unknown> | undefined
  const sidingWaste = (summary?.siding_waste || getNestedValue(measurements, "siding_waste")) as Record<string, unknown> | undefined
  const footprint = getNestedValue(measurements, "footprint") as Record<string, unknown> | undefined

  // Determine the first available tab
  const defaultTab = roof ? "roof" : area ? "siding" : trim ? "trim" : openings ? "openings" : roofline ? "roofline" : footprint ? "footprint" : corners ? "corners" : "roof"

  // Check if we have any data to show
  const hasData = roof || area || trim || openings || roofline || footprint || corners

  if (!hasData) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{jobName}</CardTitle>
          <p className="text-sm text-muted-foreground">{address}</p>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No measurement data available for this job.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{jobName}</CardTitle>
        <p className="text-sm text-muted-foreground">{address}</p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="mb-4 flex h-auto flex-wrap gap-1">
            {roof && <TabsTrigger value="roof" className="gap-1.5"><Layers className="size-3.5" />Roof</TabsTrigger>}
            {area && <TabsTrigger value="siding" className="gap-1.5"><Square className="size-3.5" />Siding</TabsTrigger>}
            {trim && <TabsTrigger value="trim" className="gap-1.5"><Ruler className="size-3.5" />Trim</TabsTrigger>}
            {openings && <TabsTrigger value="openings" className="gap-1.5"><DoorOpen className="size-3.5" />Openings</TabsTrigger>}
            {roofline && <TabsTrigger value="roofline" className="gap-1.5"><Home className="size-3.5" />Roofline</TabsTrigger>}
            {footprint && <TabsTrigger value="footprint" className="gap-1.5"><Grid3X3 className="size-3.5" />Footprint</TabsTrigger>}
            {corners && <TabsTrigger value="corners" className="gap-1.5"><CornerDownRight className="size-3.5" />Corners</TabsTrigger>}
          </TabsList>

          {/* Roof Tab */}
          {roof && (
            <TabsContent value="roof" className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Roof Facets */}
                {roof.roof_facets && (
                  <MeasurementCard 
                    title="Roof Facets" 
                    items={[
                      { label: "Total Area", value: formatNumber((roof.roof_facets as Record<string, unknown>).area, "sq ft") },
                      { label: "Count", value: formatNumber((roof.roof_facets as Record<string, unknown>).total) },
                    ]}
                  />
                )}

                {/* Ridges & Hips */}
                {roof.ridges_hips && (
                  <MeasurementCard 
                    title="Ridges & Hips" 
                    items={[
                      { label: "Length", value: formatNumber((roof.ridges_hips as Record<string, unknown>).length, "ft") },
                      { label: "Count", value: formatNumber((roof.ridges_hips as Record<string, unknown>).total) },
                    ]}
                  />
                )}

                {/* Valleys */}
                {roof.valleys && (
                  <MeasurementCard 
                    title="Valleys" 
                    items={[
                      { label: "Length", value: formatNumber((roof.valleys as Record<string, unknown>).length, "ft") },
                      { label: "Count", value: formatNumber((roof.valleys as Record<string, unknown>).total) },
                    ]}
                  />
                )}

                {/* Rakes */}
                {roof.rakes && (
                  <MeasurementCard 
                    title="Rakes" 
                    items={[
                      { label: "Length", value: formatNumber((roof.rakes as Record<string, unknown>).length, "ft") },
                      { label: "Count", value: formatNumber((roof.rakes as Record<string, unknown>).total) },
                    ]}
                  />
                )}

                {/* Gutters/Eaves */}
                {roof.gutters_eaves && (
                  <MeasurementCard 
                    title="Gutters/Eaves" 
                    items={[
                      { label: "Length", value: formatNumber((roof.gutters_eaves as Record<string, unknown>).length, "ft") },
                      { label: "Count", value: formatNumber((roof.gutters_eaves as Record<string, unknown>).total) },
                    ]}
                  />
                )}

                {/* Flashing */}
                {roof.flashing && (
                  <MeasurementCard 
                    title="Flashing" 
                    items={[
                      { label: "Length", value: formatNumber((roof.flashing as Record<string, unknown>).length, "ft") },
                      { label: "Count", value: formatNumber((roof.flashing as Record<string, unknown>).total) },
                    ]}
                  />
                )}

                {/* Step Flashing */}
                {roof.step_flashing && (
                  <MeasurementCard 
                    title="Step Flashing" 
                    items={[
                      { label: "Length", value: formatNumber((roof.step_flashing as Record<string, unknown>).length, "ft") },
                      { label: "Count", value: formatNumber((roof.step_flashing as Record<string, unknown>).total) },
                    ]}
                  />
                )}
              </div>

              {/* Pitch Breakdown */}
              {roof.pitch && Array.isArray(roof.pitch) && roof.pitch.length > 0 && (
                <div className="mt-4">
                  <h4 className="mb-2 text-sm font-medium">Roof Pitch Breakdown</h4>
                  <div className="rounded-lg border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="px-3 py-2 text-left font-medium">Pitch</th>
                          <th className="px-3 py-2 text-right font-medium">Area (sq ft)</th>
                          <th className="px-3 py-2 text-right font-medium">Percentage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(Array.isArray(roof.pitch) ? roof.pitch : []).map((p: Record<string, unknown>, i: number) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="px-3 py-2">{String(p.roof_pitch || "")}</td>
                            <td className="px-3 py-2 text-right">{formatNumber(p.area)}</td>
                            <td className="px-3 py-2 text-right">{formatNumber(p.percentage, "%")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Waste Factor */}
              {roof.waste_factor && 
               (roof.waste_factor as Record<string, unknown>).area && 
               typeof (roof.waste_factor as Record<string, unknown>).area === "object" && (
                <div className="mt-4">
                  <h4 className="mb-2 text-sm font-medium">Roof Area with Waste Factor</h4>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {Object.entries((roof.waste_factor as Record<string, Record<string, unknown>>).area || {}).map(([key, value]) => (
                      <div key={key} className="rounded-lg border bg-muted/30 px-3 py-2 text-center">
                        <p className="text-xs text-muted-foreground">{key.replace(/_/g, " ").replace("plus ", "+")}</p>
                        <p className="font-medium">{formatNumber(value, "sq ft")}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          )}

          {/* Siding Tab */}
          {area && (
            <TabsContent value="siding" className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Facades */}
                {area.facades && (
                  <MeasurementCard 
                    title="Facade Area" 
                    items={[
                      { label: "Siding", value: formatNumber((area.facades as Record<string, unknown>).siding, "sq ft") },
                      { label: "Other", value: formatNumber((area.facades as Record<string, unknown>).other, "sq ft") },
                    ]}
                  />
                )}

                {/* Total Area */}
                {area.total && (
                  <MeasurementCard 
                    title="Total Wall Area" 
                    items={[
                      { label: "Siding", value: formatNumber((area.total as Record<string, unknown>).siding, "sq ft") },
                      { label: "Other", value: formatNumber((area.total as Record<string, unknown>).other, "sq ft") },
                    ]}
                  />
                )}

                {/* Openings Area */}
                {area.openings && (
                  <MeasurementCard 
                    title="Openings Area" 
                    items={[
                      { label: "Siding", value: formatNumber((area.openings as Record<string, unknown>).siding, "sq ft") },
                      { label: "Other", value: formatNumber((area.openings as Record<string, unknown>).other, "sq ft") },
                    ]}
                  />
                )}
              </div>

              {/* Siding Waste */}
              {sidingWaste && (
                <div className="mt-4">
                  <h4 className="mb-2 text-sm font-medium">Siding Area with Waste Factor</h4>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <WasteCard label="Base" value={sidingWaste.zero} />
                    <WasteCard label="+10%" value={sidingWaste.plus_10_percent} />
                    <WasteCard label="+18%" value={sidingWaste.plus_18_percent} />
                    <WasteCard label="With Openings" value={sidingWaste.with_openings} />
                    <WasteCard label="Openings +10%" value={sidingWaste.openings_plus_10_percent} />
                    <WasteCard label="Openings +18%" value={sidingWaste.openings_plus_18_percent} />
                  </div>
                </div>
              )}
            </TabsContent>
          )}

          {/* Trim Tab */}
          {trim && (
            <TabsContent value="trim" className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {trim.level_starter && (
                  <MeasurementCard 
                    title="Level Starter" 
                    items={[
                      { label: "Siding", value: formatNumber((trim.level_starter as Record<string, unknown>).siding, "ft") },
                      { label: "Other", value: formatNumber((trim.level_starter as Record<string, unknown>).other, "ft") },
                    ]}
                  />
                )}
                {trim.sloped_trim && (
                  <MeasurementCard 
                    title="Sloped Trim" 
                    items={[
                      { label: "Siding", value: formatNumber((trim.sloped_trim as Record<string, unknown>).siding, "ft") },
                      { label: "Other", value: formatNumber((trim.sloped_trim as Record<string, unknown>).other, "ft") },
                    ]}
                  />
                )}
                {trim.vertical_trim && (
                  <MeasurementCard 
                    title="Vertical Trim" 
                    items={[
                      { label: "Siding", value: formatNumber((trim.vertical_trim as Record<string, unknown>).siding, "ft") },
                      { label: "Other", value: formatNumber((trim.vertical_trim as Record<string, unknown>).other, "ft") },
                    ]}
                  />
                )}
              </div>
            </TabsContent>
          )}

          {/* Openings Tab */}
          {openings && (
            <TabsContent value="openings" className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {openings.quantity && (
                  <MeasurementCard 
                    title="Openings Count" 
                    items={[
                      { label: "Siding", value: formatNumber((openings.quantity as Record<string, unknown>).siding) },
                      { label: "Other", value: formatNumber((openings.quantity as Record<string, unknown>).other) },
                    ]}
                  />
                )}
                {openings.tops_length && (
                  <MeasurementCard 
                    title="Top Lengths" 
                    items={[
                      { label: "Siding", value: formatNumber((openings.tops_length as Record<string, unknown>).siding, "ft") },
                      { label: "Other", value: formatNumber((openings.tops_length as Record<string, unknown>).other, "ft") },
                    ]}
                  />
                )}
                {openings.sills_length && (
                  <MeasurementCard 
                    title="Sill Lengths" 
                    items={[
                      { label: "Siding", value: formatNumber((openings.sills_length as Record<string, unknown>).siding, "ft") },
                      { label: "Other", value: formatNumber((openings.sills_length as Record<string, unknown>).other, "ft") },
                    ]}
                  />
                )}
                {openings.sides_length && (
                  <MeasurementCard 
                    title="Side Lengths" 
                    items={[
                      { label: "Siding", value: formatNumber((openings.sides_length as Record<string, unknown>).siding, "ft") },
                      { label: "Other", value: formatNumber((openings.sides_length as Record<string, unknown>).other, "ft") },
                    ]}
                  />
                )}
                {openings.total_perimeter && (
                  <MeasurementCard 
                    title="Total Perimeter" 
                    items={[
                      { label: "Siding", value: formatNumber((openings.total_perimeter as Record<string, unknown>).siding, "ft") },
                      { label: "Other", value: formatNumber((openings.total_perimeter as Record<string, unknown>).other, "ft") },
                    ]}
                  />
                )}
              </div>
            </TabsContent>
          )}

          {/* Roofline Tab */}
          {roofline && (
            <TabsContent value="roofline" className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {roofline.eaves_fascia && (
                  <MeasurementCard 
                    title="Eaves Fascia" 
                    items={[
                      { label: "Length", value: formatNumber((roofline.eaves_fascia as Record<string, unknown>).length, "ft") },
                      { label: "Avg Depth", value: formatNumber((roofline.eaves_fascia as Record<string, unknown>).avg_depth, "ft") },
                      { label: "Soffit Area", value: formatNumber((roofline.eaves_fascia as Record<string, unknown>).soffit_area, "sq ft") },
                    ]}
                  />
                )}
                {roofline.level_frieze_board && (
                  <MeasurementCard 
                    title="Level Frieze Board" 
                    items={[
                      { label: "Length", value: formatNumber((roofline.level_frieze_board as Record<string, unknown>).length, "ft") },
                      { label: "Avg Depth", value: formatNumber((roofline.level_frieze_board as Record<string, unknown>).avg_depth, "ft") },
                      { label: "Soffit Area", value: formatNumber((roofline.level_frieze_board as Record<string, unknown>).soffit_area, "sq ft") },
                    ]}
                  />
                )}
                {roofline.rakes_fascia && (
                  <MeasurementCard 
                    title="Rakes Fascia" 
                    items={[
                      { label: "Length", value: formatNumber((roofline.rakes_fascia as Record<string, unknown>).length, "ft") },
                      { label: "Avg Depth", value: formatNumber((roofline.rakes_fascia as Record<string, unknown>).avg_depth, "ft") },
                      { label: "Soffit Area", value: formatNumber((roofline.rakes_fascia as Record<string, unknown>).soffit_area, "sq ft") },
                    ]}
                  />
                )}
                {roofline.sloped_frieze_board && (
                  <MeasurementCard 
                    title="Sloped Frieze Board" 
                    items={[
                      { label: "Length", value: formatNumber((roofline.sloped_frieze_board as Record<string, unknown>).length, "ft") },
                      { label: "Avg Depth", value: formatNumber((roofline.sloped_frieze_board as Record<string, unknown>).avg_depth, "ft") },
                      { label: "Soffit Area", value: formatNumber((roofline.sloped_frieze_board as Record<string, unknown>).soffit_area, "sq ft") },
                    ]}
                  />
                )}
              </div>
            </TabsContent>
          )}

          {/* Footprint Tab */}
          {footprint && (
            <TabsContent value="footprint" className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <MeasurementCard 
                  title="Building Footprint" 
                  items={[
                    { label: "Stories", value: formatNumber(footprint.stories) },
                    { label: "Perimeter", value: formatNumber(footprint.perimeter, "ft") },
                    { label: "Area", value: formatNumber(footprint.area, "sq ft") },
                  ]}
                />
              </div>
            </TabsContent>
          )}

          {/* Corners Tab */}
          {corners && (
            <TabsContent value="corners" className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <MeasurementCard 
                  title="Inside Corners" 
                  items={[
                    { label: "Count (Siding)", value: formatNumber((corners.inside_corners_qty as Record<string, unknown>)?.siding) },
                    { label: "Length (Siding)", value: formatNumber((corners.inside_corners_len as Record<string, unknown>)?.siding, "ft") },
                  ]}
                />
                <MeasurementCard 
                  title="Outside Corners" 
                  items={[
                    { label: "Count (Siding)", value: formatNumber((corners.outside_corners_qty as Record<string, unknown>)?.siding) },
                    { label: "Length (Siding)", value: formatNumber((corners.outside_corners_len as Record<string, unknown>)?.siding, "ft") },
                  ]}
                />
              </div>
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  )
}

// Helper component for measurement cards
function MeasurementCard({ 
  title, 
  items 
}: { 
  title: string
  items: { label: string; value: string }[] 
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <h4 className="mb-2 text-sm font-medium">{title}</h4>
      <div className="space-y-1">
        {items.map((item, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{item.label}</span>
            <span className="font-medium">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Helper for waste factor display
function WasteCard({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-lg border bg-muted/30 px-3 py-2 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{formatNumber(value, "sq ft")}</p>
    </div>
  )
}
