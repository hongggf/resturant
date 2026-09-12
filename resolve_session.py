import sys

with open('frontend/src/pages/cashier/session.tsx', 'r') as f:
    content = f.read()

content = content.replace('''<<<<<<< HEAD
      ) : !data && isError ? (
=======
      ) : isLoadingError ? (
>>>>>>> stream3/subagent-Stream-3-Implementer-feature-implementer-5b376fc2''', '''      ) : isLoadingError ? (''')

with open('frontend/src/pages/cashier/session.tsx', 'w') as f:
    f.write(content)
