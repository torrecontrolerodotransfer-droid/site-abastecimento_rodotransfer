# AbastecimentoApp 🚗⛽

Sistema web elegante e sofisticado para controle de abastecimento de veículos com registro de cupons fiscais.

## ✨ Funcionalidades

- 📝 **Lançamento de Abastecimento**: Registre data, placa, motorista, combustível, valor e quilometragem
- 📸 **Upload de Cupom**: Tire foto do cupom fiscal pela câmera ou galeria
- 📊 **Dashboard**: Visualize estatísticas de consumo, gasto total e média por veículo
- 📋 **Listagem**: Veja todos os abastecimentos com filtros por placa, combustível e período
- 📥 **Exportação**: Baixe dados em CSV ou JSON para análise externa
- 📱 **PWA**: Funciona como aplicativo no celular, tablet e desktop
- 🔐 **Autenticação**: Login seguro com Manus OAuth
- ☁️ **Nuvem**: Cupons salvos em S3, dados em banco de dados seguro

## 🛠️ Stack Tecnológico

**Frontend:**
- React 19
- TypeScript
- Tailwind CSS 4
- shadcn/ui
- tRPC Client
- Wouter (routing)

**Backend:**
- Express 4
- tRPC 11
- Drizzle ORM
- MySQL/TiDB
- Node.js

**Infraestrutura:**
- Vite (build)
- Vitest (testes)
- Drizzle Kit (migrações)

## 📦 Instalação Local

### Pré-requisitos
- Node.js 18+
- pnpm (recomendado) ou npm
- MySQL 8+ ou TiDB

### Passos

1. **Clone o repositório**
```bash
git clone https://github.com/seu-usuario/abastecimento-app.git
cd abastecimento-app
```

2. **Instale dependências**
```bash
pnpm install
```

3. **Configure variáveis de ambiente**
```bash
cp .env.example .env
# Edite .env com suas credenciais
```

4. **Configure o banco de dados**
```bash
pnpm db:push
```

5. **Inicie o servidor de desenvolvimento**
```bash
pnpm dev
```

6. **Acesse a aplicação**
```
http://localhost:5173
```

## 🚀 Deploy no Render

Veja [DEPLOY_INSTRUCTIONS.md](../DEPLOY_INSTRUCTIONS.md) para instruções completas.

### Resumo Rápido

1. Faça push para GitHub
2. Crie Web Service no Render
3. Configure variáveis de ambiente
4. Deploy automático

## 🧪 Testes

```bash
# Executar testes
pnpm test

# Testes com watch
pnpm test:watch

# Coverage
pnpm test:coverage
```

## 📁 Estrutura do Projeto

```
.
├── client/                 # Frontend React
│   ├── src/
│   │   ├── pages/         # Páginas (Home, NewRefueling, Dashboard, RefuelingsList)
│   │   ├── components/    # Componentes reutilizáveis
│   │   ├── contexts/      # React Contexts
│   │   ├── hooks/         # Custom Hooks
│   │   ├── lib/           # Utilitários
│   │   ├── App.tsx        # Roteamento
│   │   └── index.css      # Estilos globais
│   ├── public/            # Assets estáticos
│   └── index.html
├── server/                # Backend Express + tRPC
│   ├── routers.ts         # Procedimentos tRPC
│   ├── db.ts              # Queries do banco
│   ├── storage.ts         # Upload de arquivos
│   ├── _core/             # Infraestrutura
│   └── *.test.ts          # Testes
├── drizzle/               # Schema e migrações
│   ├── schema.ts          # Definição de tabelas
│   └── migrations/        # Arquivos SQL
├── shared/                # Código compartilhado
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

## 🔐 Segurança

- ✅ Autenticação via OAuth
- ✅ Isolamento de dados por usuário
- ✅ Validações de entrada (Zod)
- ✅ CORS configurado
- ✅ Variáveis sensíveis em ambiente
- ✅ Criptografia de dados em trânsito

## 📊 Banco de Dados

### Tabelas

**users**
- id (PK)
- openId (OAuth)
- name, email
- role (user/admin)
- timestamps

**refuelings**
- id (PK)
- userId (FK)
- date, plate, driverName
- fuelType, pricePerLiter, litersRefueled, totalPrice
- gasStation, km
- notes
- timestamps

**receipts**
- id (PK)
- refuelingId (FK)
- storageKey, storageUrl
- fileName, mimeType, fileSize
- createdAt

## 🌐 Variáveis de Ambiente

Veja `.env.example` para a lista completa. Principais:

- `DATABASE_URL`: Connection string MySQL
- `JWT_SECRET`: Secret para JWT
- `VITE_APP_ID`: ID da aplicação OAuth
- `OWNER_OPEN_ID`: ID do proprietário
- `VITE_APP_TITLE`: Título da aplicação

## 📱 PWA

O aplicativo é uma Progressive Web App:
- Instale no celular/tablet
- Funciona offline (assets estáticos)
- Ícone na tela inicial
- Experiência mobile-first

## 🐛 Troubleshooting

### Erro de conexão com banco
```bash
# Verifique a DATABASE_URL
mysql -u user -p -h host -e "SELECT 1"
```

### Erro de build
```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
pnpm build
```

### Porta 3000 em uso
```bash
# Mude a porta em server/_core/index.ts
# ou use: PORT=3001 pnpm dev
```

## 📝 Contribuindo

1. Faça fork do projeto
2. Crie uma branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

MIT License - veja LICENSE.md

## 🙋 Suporte

- 📧 Email: seu-email@example.com
- 🐛 Issues: [GitHub Issues](https://github.com/seu-usuario/abastecimento-app/issues)
- 📚 Docs: [Documentação](./docs)

## 🎯 Roadmap

- [ ] Gráficos de tendência de consumo
- [ ] Relatórios mensais/anuais
- [ ] Integração com APIs de combustível
- [ ] Notificações de manutenção
- [ ] Suporte a múltiplos usuários/empresas
- [ ] App mobile nativo (React Native)

---

**Desenvolvido com ❤️ usando React, TypeScript e Tailwind CSS**

**Versão:** 1.0.0  
**Última atualização:** 2026-05-26
