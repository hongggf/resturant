const fs = require('fs');
const file = 'frontend/src/pages/cashier/table-board.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'import { LayoutGrid } from "lucide-react"',
  'import { LayoutGrid, WifiOff } from "lucide-react"'
);

content = content.replace(
  'useTablesOverview,\n} from "@/features/sessions/hooks/use-tables-overview"',
  'useTablesOverview,\n} from "@/features/sessions/hooks/use-tables-overview"\nimport { useIsOffline } from "@/hooks/use-offline"'
);

content = content.replace(
  '  const openSession = useOpenSession()',
  '  const openSession = useOpenSession()\n  const isOffline = useIsOffline()'
);

// We need to add the banner and not drop cached data
// Change `isError ? ... : tables.length === 0 ?` to `!data && isError ? ...`
content = content.replace(
  '      ) : isError ? (',
  '      ) : !data && isError ? ('
);

const banner = `
      {isOffline && (
        <Alert variant="destructive" className="mb-4 bg-destructive/10">
          <WifiOff className="size-4" />
          <AlertTitle>You are offline</AlertTitle>
          <AlertDescription>
            Showing cached data. New orders or updates may fail to save.
          </AlertDescription>
        </Alert>
      )}
`;

content = content.replace(
  '      <div className="flex items-start justify-between gap-4">',
  banner + '\n      <div className="flex items-start justify-between gap-4">'
);

fs.writeFileSync(file, content);
