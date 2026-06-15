# Quitéria - Arquitetura

## Princípios

- Segurança em primeiro lugar
- Multiempresa isolado por restaurant_id
- RLS habilitado em todas as tabelas
- Nenhuma tela acessa Supabase diretamente
- Page → Service → Repository → Supabase
- Componentes pequenos
- Tipagem forte
- Auditoria em ações críticas
- Performance e escalabilidade desde o início

## Estrutura

app/
components/
lib/
types/
supabase/
docs/

## Perfis

SUPER_ADMIN
MANAGER
CASHIER
WAITER
KITCHEN
BAR