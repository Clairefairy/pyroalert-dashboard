# 🔥 Pyro Alert Dashboard

Dashboard de monitoramento em tempo real para o sistema **Pyro Alert** - uma solução de detecção e prevenção de incêndios.

![React](https://img.shields.io/badge/React-18.3.1-61DAFB?logo=react)
![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?logo=vite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss)
![Leaflet](https://img.shields.io/badge/Leaflet-1.9.4-199900?logo=leaflet)

## 📋 Funcionalidades

### 🔐 Autenticação
- Login com e-mail e senha (OAuth2)
- Cadastro de novos usuários
- Autenticação de Dois Fatores (2FA/TOTP)
- Refresh token automático
- Logout com revogação de token

### 👤 Perfil do Usuário
- Visualização de dados do usuário logado
- Edição de nome, e-mail, telefone e documento
- Alteração de senha (requer senha atual)
- Ativação/Desativação de 2FA com QR Code
- Códigos de recuperação para 2FA

### 📊 Dashboard
- Monitoramento de temperatura em tempo real
- Monitoramento de umidade
- Detecção de gases inflamáveis (sensor MQ)
- Última leitura bruta dos sensores

### 🗺️ Mapa de Dispositivos
- Mapa interativo com OpenStreetMap + Leaflet
- Visualização de todos os dispositivos IoT
- Indicadores de nível de risco (alto, moderado, baixo)
- Animação de pulsação nos marcadores
- Detalhes do dispositivo ao clicar:
  - Status (ativo/inativo)
  - Probabilidade de risco de incêndio
  - Umidade do ar e do solo
  - Temperatura
  - Detecção de gás inflamável
  - Localização (latitude/longitude)

## 🚀 Tecnologias

- **Frontend**: React 18 + Vite
- **Estilização**: Tailwind CSS
- **Mapas**: Leaflet + React-Leaflet + OpenStreetMap
- **Autenticação**: OAuth2 (Password Grant + Refresh Token)
- **API**: REST (backend em Node.js/MongoDB)

## 📦 Instalação

### Pré-requisitos
- Node.js 18+ 
- npm ou yarn

### Passos

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/pyroalert-dashboard.git
cd pyroalert-dashboard
```

2. Instale as dependências:
```bash
npm install
```

3. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

4. Acesse no navegador:
```
http://localhost:5173
```

## 🔧 Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia o servidor de desenvolvimento |
| `npm run build` | Gera build de produção |
| `npm run preview` | Visualiza o build de produção |

## 🌐 API Backend

O dashboard se conecta à API do Pyro Alert:

**Base URL**: `https://pyroalert-mongodb.onrender.com`

### Endpoints Principais

#### Autenticação
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/oauth/token` | Login (OAuth2 Password Grant) |
| POST | `/oauth/revoke` | Logout (revoga token) |
| POST | `/api/v1/auth/register` | Cadastro de usuário |
| GET | `/api/v1/auth/me` | Dados do usuário logado |
| PUT | `/api/v1/auth/me` | Atualizar dados do usuário |

#### Autenticação de Dois Fatores (2FA)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/v1/2fa/status` | Verificar se 2FA está ativo |
| POST | `/api/v1/2fa/setup` | Iniciar configuração do 2FA |
| POST | `/api/v1/2fa/verify` | Verificar código e ativar 2FA |
| DELETE | `/api/v1/2fa` | Desativar 2FA |

## 📁 Estrutura do Projeto

```
pyroalert-dashboard/
├── public/
│   └── fire.svg
├── src/
│   ├── App.jsx          # Componente principal
│   ├── main.jsx         # Entry point
│   └── index.css        # Estilos globais + Tailwind
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── README.md
```

## 🎨 Componentes Principais

- **App**: Componente raiz com roteamento e estado global
- **LoginPage**: Tela de login e cadastro
- **TwoFactorLoginPage**: Tela de verificação 2FA
- **Dashboard**: Tela principal com sensores e mapa
- **ProfilePage**: Tela de perfil do usuário
- **DeviceMap**: Mapa interativo com dispositivos
- **DeviceMarker**: Marcador animado de dispositivo
- **DeviceInfoModal**: Modal com detalhes do dispositivo

## 🔒 Segurança

- Tokens armazenados no localStorage
- Refresh automático antes da expiração
- Senha atual obrigatória para alterações
- 2FA com TOTP (Google Authenticator, Authy, etc.)
- Códigos de recuperação para 2FA

## 📱 Responsividade

O dashboard é totalmente responsivo e funciona em:
- 💻 Desktop
- 📱 Tablet
- 📱 Mobile

## 🤝 Contribuindo

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 👥 Equipe

Desenvolvido pela equipe **Pyro Alert** © 2025

---

<p align="center">
  <strong>🔥 Pyro Alert - Prevenção de Incêndios com IoT</strong>
</p>
