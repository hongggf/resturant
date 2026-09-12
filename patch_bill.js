const fs = require('fs');
const file = 'frontend/src/pages/cashier/bill.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'import { ArrowLeft, ReceiptText } from "lucide-react"',
  'import { ArrowLeft, ReceiptText, WifiOff } from "lucide-react"'
);

content = content.replace(
  'import { useBill } from "@/features/payments/hooks/use-payment"',
  'import { useBill } from "@/features/payments/hooks/use-payment"\nimport { useIsOffline } from "@/hooks/use-offline"'
);

content = content.replace(
  '  const tableNumber = bill?.tableNumber ?? location.state?.tableNumber',
  '  const tableNumber = bill?.tableNumber ?? location.state?.tableNumber\n  const isOffline = useIsOffline()'
);

content = content.replace(
  '      ) : isError ? (',
  '      ) : !bill && isError ? ('
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
  '      <div className="flex items-center gap-2">',
  banner + '\n      <div className="flex items-center gap-2">'
);

fs.writeFileSync(file, content);
