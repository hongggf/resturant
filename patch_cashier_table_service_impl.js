const fs = require('fs');
const file = 'backend/src/main/java/com/vichovong/restaurant_pos/feature/table/service/impl/CashierTableServiceImpl.java';
let content = fs.readFileSync(file, 'utf8');

const transferImpl = `
    @Override
    @Transactional
    public void transferSession(UUID sessionId, UUID targetTableId) {
        TableSession session = tableSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Session not found"));
                
        if (session.getStatus() != SessionStatus.ACTIVE) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Can only transfer active sessions");
        }

        DiningTable targetTable = diningTableRepository.findById(targetTableId)
                .filter(DiningTable::isActive)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Target table not found"));

        if (tableSessionRepository.findByTableIdAndStatus(targetTableId, SessionStatus.ACTIVE).isPresent()) {
            throw new ApiException(HttpStatus.CONFLICT, "Target table already has an active session");
        }

        session.setTable(targetTable);
        tableSessionRepository.save(session);
    }
`;

content = content.replace(
  '    public StaffSessionResponse openSession(UUID tableId) {',
  transferImpl + '\n    @Override\n    public StaffSessionResponse openSession(UUID tableId) {'
);

fs.writeFileSync(file, content);
