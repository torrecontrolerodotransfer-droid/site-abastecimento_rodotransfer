# TODO - Sistema de Lançamento de Abastecimento

## Banco de Dados e Backend
- [x] Criar tabela de abastecimentos com campos: data, placa, valor_litro, litros, valor_total, posto, km, combustivel, usuario_id
- [x] Criar tabela de cupons com referência ao abastecimento (storage_key, url)
- [x] Implementar procedimentos tRPC para CRUD de abastecimentos
- [x] Implementar procedimento tRPC para upload de cupom (foto)
- [x] Implementar procedimento tRPC para listagem de abastecimentos do usuário
- [x] Implementar procedimento tRPC para cálculo de resumo (total gasto, média consumo)
- [x] Implementar procedimento tRPC para exportação CSV/JSON
- [x] Implementar validações de segurança (usuário só acessa seus dados)

## Frontend - Formulário de Lançamento
- [x] Criar página de novo lançamento com formulário elegante
- [x] Implementar campos: Data, Placa, Nome do Motorista, Valor por Litro, Litros Abastecidos, Posto, KM, Tipo de Combustível
- [x] Implementar cálculo automático de Valor Total (Valor Litro × Litros)
- [x] Implementar upload de foto com câmera/galeria
- [x] Implementar preview da imagem antes de salvar
- [x] Implementar botão de confirmação com validação de campos
- [x] Integrar com tRPC para salvar dados e foto

## Frontend - Listagem de Abastecimentos
- [x] Criar página de listagem com cards ou tabela responsiva
- [x] Exibir informações principais de cada abastecimento
- [x] Implementar botão para visualizar cupom anexado
- [x] Implementar modal/drawer para exibir cupom em alta resolução
- [x] Implementar ações: editar, deletar, visualizar detalhes
- [x] Implementar filtros por período, placa, tipo de combustível
- [x] Implementar paginação ou scroll infinito

## Frontend - Dashboard
- [x] Criar página de dashboard com resumos
- [x] Exibir total gasto em abastecimentos
- [x] Exibir média de consumo (km/l)
- [x] Exibir histórico por veículo/placa
- [ ] Exibir gráficos de tendência de consumo
- [ ] Exibir últimos abastecimentos
- [x] Implementar cards informativos com dados agregados

## Frontend - Exportação
- [x] Implementar botão de exportação em CSV
- [x] Implementar botão de exportação em JSON
- [x] Gerar arquivo estruturado e fazer download
- [ ] Incluir filtros na exportação (período, placa, etc)

## Frontend - PWA e Layout
- [x] Configurar manifest.json para PWA
- [x] Implementar service worker
- [x] Implementar layout responsivo mobile-first
- [x] Criar navegação principal (Home, Novo Lançamento, Listagem, Dashboard)
- [x] Implementar botão de voltar para tela inicial em Dashboard e Listagem
- [ ] Testar no celular (responsividade, câmera, galeria)
- [x] Implementar tema elegante e sofisticado
- [ ] Otimizar performance para mobile

## Design e UX
- [ ] Definir paleta de cores elegante e sofisticada
- [ ] Implementar tipografia refinada
- [ ] Criar componentes com espaçamento adequado
- [ ] Implementar transições suaves
- [ ] Garantir acessibilidade (contraste, foco)
- [ ] Revisar hierarquia visual em todas as páginas

## Testes e Validação
- [ ] Testar upload de foto (câmera e galeria)
- [ ] Testar cálculo automático de valor total
- [ ] Testar listagem e filtros
- [ ] Testar dashboard e gráficos
- [ ] Testar exportação CSV/JSON
- [x] Testar autenticação (isolamento de dados)
- [ ] Testar responsividade em diferentes tamanhos
- [ ] Testar PWA (offline, instalação)
- [x] Escrever testes vitest para procedimentos tRPC
- [x] Escrever testes vitest para funções críticas

## Entrega
- [ ] Revisar todo o código
- [ ] Documentar instruções de uso
- [ ] Criar checkpoint final
- [ ] Entregar link do aplicativo ao usuário
