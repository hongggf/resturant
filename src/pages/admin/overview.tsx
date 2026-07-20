import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const stats = [
  { label: "Open sessions", hint: "Tables with an active session" },
  { label: "Tables", hint: "Configured tables" },
  { label: "Menu items", hint: "Items available for ordering" },
  { label: "Categories", hint: "Menu sections" },
]

export function OverviewPage() {
  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-muted-foreground text-sm">
          A quick look at today&apos;s operation.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader>
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle className="text-3xl tabular-nums">—</CardTitle>
              <CardDescription>{stat.hint}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
      <p className="text-muted-foreground text-sm">
        Live numbers arrive as each feature is built — categories first.
      </p>
    </>
  )
}
