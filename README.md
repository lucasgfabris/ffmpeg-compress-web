# 🎬 FFmpeg Compress Web

Aplicação web simples para comprimir e converter vídeos usando FFmpeg.

## Requisitos

- **Node.js** 18+
- **FFmpeg** instalado no sistema

### Instalando FFmpeg no Windows

```powershell
winget install ffmpeg
```

Ou via Chocolatey:
```powershell
choco install ffmpeg
```

## Instalação

```bash
cd ffmpeg-compress-web
npm install
```

## Uso

```bash
npm start
```

Acesse: http://localhost:3000

## Funcionalidades

- ✅ Upload de vídeos via drag-and-drop
- ✅ Compressão com diferentes níveis de qualidade (CRF 18-32)
- ✅ Redimensionamento (1080p, 720p, 480p, 360p)
- ✅ Barra de progresso em tempo real
- ✅ Download do vídeo comprimido
- ✅ Interface moderna e responsiva

## Configurações de Qualidade

| CRF | Qualidade | Uso Recomendado |
|-----|-----------|-----------------|
| 18 | Alta | Arquivamento, qualidade máxima |
| 23 | Média | Uso geral (padrão) |
| 28 | Baixa | Compartilhamento rápido |
| 32 | Muito Baixa | Máxima compressão |

## Formatos Suportados

- MP4, AVI, MOV, MKV, WMV, FLV, WebM

## Licença

MIT
