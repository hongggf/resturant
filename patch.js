const fs = require('fs');
const file = 'frontend/src/features/sessions/components/round-card.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent to imports
content = content.replace(
  'DropdownMenuTrigger,\n} from "@/components/ui/dropdown-menu"',
  'DropdownMenuTrigger,\n  DropdownMenuSub,\n  DropdownMenuSubTrigger,\n  DropdownMenuSubContent,\n} from "@/components/ui/dropdown-menu"'
);

// Add onVoidLine to RoundCardProps
content = content.replace(
  '  onEditLine: (round: CashierRound, line: RoundLine) => void\n}',
  '  onEditLine: (round: CashierRound, line: RoundLine) => void\n  onVoidLine: (round: CashierRound, line: RoundLine) => void\n}'
);

// Add onVoidLine to RoundCard function args
content = content.replace(
  '  onEditLine,\n}: RoundCardProps) {',
  '  onEditLine,\n  onVoidLine,\n}: RoundCardProps) {'
);

const original = `              ) : editableLines.length === 1 ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEditLine(round, editableLines[0])}
                >
                  <Pencil />
                  Edit
                </Button>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Pencil />
                      Edit
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {editableLines.map((line) => (
                      <DropdownMenuItem
                        key={line.id}
                        onClick={() => onEditLine(round, line)}
                      >
                        {line.quantity}× {line.nameEn}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ))}`;

const replacement = `              ) : editableLines.length === 1 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Pencil />
                      Edit
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => onEditLine(round, editableLines[0])}
                    >
                      Change options...
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => onVoidLine(round, editableLines[0])}
                    >
                      Void item...
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Pencil />
                      Edit
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {editableLines.map((line) => (
                      <DropdownMenuSub key={line.id}>
                        <DropdownMenuSubTrigger>
                          {line.quantity}× {line.nameEn}
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                          <DropdownMenuItem
                            onClick={() => onEditLine(round, line)}
                          >
                            Change options...
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => onVoidLine(round, line)}
                          >
                            Void item...
                          </DropdownMenuItem>
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ))}`;

content = content.replace(original, replacement);
fs.writeFileSync(file, content);
