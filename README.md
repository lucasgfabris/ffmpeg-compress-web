# FFmpeg Compress Web

![GitHub repo size](https://img.shields.io/github/repo-size/lucasgfabris/ffmpeg-compress-web?style=for-the-badge)
![GitHub language count](https://img.shields.io/github/languages/count/lucasgfabris/ffmpeg-compress-web?style=for-the-badge)

> Aplicacao web para comprimir e converter videos usando FFmpeg. Suporta upload de ate 5 videos simultaneos, com barra de progresso em tempo real e download do resultado.

<img src="imagem.png" alt="FFmpeg Compress Web">

## Pre-requisitos

Antes de comecar, verifique se voce atendeu aos seguintes requisitos:

- Node.js 18 ou superior
- FFmpeg instalado no sistema

### Instalando FFmpeg no Windows

```powershell
winget install ffmpeg
```

Ou via Chocolatey:

```powershell
choco install ffmpeg
```

### Instalando FFmpeg no Linux/macOS

```bash
# Ubuntu/Debian
sudo apt install ffmpeg

# macOS
brew install ffmpeg
```

## Instalando

Para instalar o FFmpeg Compress Web, siga estas etapas:

```bash
git clone https://github.com/lucasgfabris/ffmpeg-compress-web.git
cd ffmpeg-compress-web
npm install
```

## Usando

Para usar o FFmpeg Compress Web, siga estas etapas:

```bash
npm start
```

Acesse: http://localhost:3000

### Funcionalidades

- Upload de videos via drag-and-drop ou selecao
- Compressao com diferentes niveis de qualidade (CRF 18-32)
- Redimensionamento (1080p, 720p, 480p, 360p ou original)
- Opcao de tamanho maximo (ex.: ate 4 MB)
- Barra de progresso em tempo real
- Download do video comprimido
- Processamento paralelo de ate 5 videos

### Configuracoes de Qualidade

| CRF | Qualidade | Uso Recomendado |
|-----|-----------|-----------------|
| 18 | Alta | Arquivamento, qualidade maxima |
| 23 | Media | Uso geral (padrao) |
| 28 | Baixa | Compartilhamento rapido |
| 32 | Muito Baixa | Maxima compressao |

### Formatos Suportados

MP4, AVI, MOV, MKV, WMV, FLV, WebM

## Tecnologias

| Camada | Tecnologias |
|--------|-------------|
| Backend | Node.js, Express |
| Frontend | HTML, CSS, JavaScript |
| Upload | Multer |
| Processamento | FFmpeg (fluent-ffmpeg) |
| Deploy | Docker, Render |

## Estrutura do Projeto

```
ffmpeg-compress-web/
├── server.js           # Servidor Express e rotas da API
├── public/
│   ├── index.html      # Interface principal
│   ├── app.js          # Logica do frontend
│   └── styles.css      # Estilos (tema escuro)
├── Dockerfile          # Imagem Docker com FFmpeg
├── render.yaml         # Configuracao de deploy no Render
└── package.json        # Dependencias
```

## Contribuindo

Para contribuir com FFmpeg Compress Web, siga estas etapas:

1. Bifurque este repositorio.
2. Crie um branch: `git checkout -b <nome_branch>`.
3. Faca suas alteracoes e confirme-as: `git commit -m '<mensagem_commit>'`
4. Envie para o branch original: `git push origin <nome_branch>`
5. Crie a solicitacao de pull.

## Licenca

Esse projeto esta sob licenca MIT.
