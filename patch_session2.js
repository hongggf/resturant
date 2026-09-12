const fs = require('fs');
const file = 'frontend/src/pages/cashier/session.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'import { ArrowLeft, Plus, ReceiptText, UtensilsCrossed } from "lucide-react"',
  'import { ArrowLeft, Plus, ReceiptText, UtensilsCrossed, WifiOff } from "lucide-react"'
);

content = content.replace(
  'import { formatPrice } from "@/lib/format"',
  'import { formatPrice } from "@/lib/format"\nimport { useIsOffline } from "@/hooks/use-offline"'
);

content = content.replace(
  '  const [editing, setEditing] = useState<{',
  '  const isOffline = useIsOffline()\n  const [editing, setEditing] = useState<{'
);

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
