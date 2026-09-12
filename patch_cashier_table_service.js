const fs = require('fs');
const file = 'backend/src/main/java/com/vichovong/restaurant_pos/feature/table/service/CashierTableService.java';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  '    StaffSessionResponse openSession(UUID tableId);\n}',
  '    StaffSessionResponse openSession(UUID tableId);\n\n    void transferSession(UUID sessionId, UUID targetTableId);\n}'
);

fs.writeFileSync(file, content);
