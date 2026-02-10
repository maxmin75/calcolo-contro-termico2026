# calcolo-contro-termico2026

Motore di calcolo per simulazioni del Conto Termico 2026.

## Contenuto
- `contotermico-webapp/src/lib/contotermico-calcolo.ts`: logica di calcolo e validazioni
- `contotermico-webapp/src/lib/__tests__/contotermico-calcolo.test.ts`: test del motore

## Requisiti
- Node.js (per eseguire i test)

## Esecuzione test
Se hai un runner compatibile con i test in TypeScript/Node:
```bash
node contotermico-webapp/src/lib/__tests__/contotermico-calcolo.test.ts
```

## Note
I parametri e i moltiplicatori sono configurati in `DEFAULT_GSE_CONFIG` e possono essere modificati in base alle regole ufficiali.
