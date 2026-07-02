import type { BreadcrumbItem } from '../ui/Breadcrumb'

// Mapeamento simples pathname -> breadcrumb. Só 4 rotas protegidas existem
// hoje, não justifica um resolvedor genérico de rotas dinâmicas ainda.
export function buildBreadcrumb(pathname: string): BreadcrumbItem[] {
  if (pathname === '/providers') {
    return [{ label: 'Prestadores' }]
  }
  if (pathname === '/providers/new') {
    return [{ label: 'Prestadores', to: '/providers' }, { label: 'Novo prestador' }]
  }
  if (pathname.startsWith('/providers/')) {
    return [{ label: 'Prestadores', to: '/providers' }, { label: 'Detalhe do prestador' }]
  }
  return [{ label: 'Resumo' }]
}
