const express = require('express')
const cors = require('cors')
const app = express()
const path = require('path')

const download = require('../robots/download')

app.use(express.urlencoded({ extended: false }))
app.use(express.json())
app.use(cors())
app.use(express.static('public'))
app.use('/downloads', express.static(path.join(__dirname, '../../download')))

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'public', 'index.html'))
})

app.post('/download', async (req, res) => {
  console.log('starting new download')
  try {
    const { inputVideo, inputIn, inputOut, filename } = req.body
    const finalFilename = filename && filename.trim() !== ''
      ? filename.trim()
      : String(Date.now()).replace('.', '').trim()
    const data = {
      url: inputVideo,
      from: inputIn,
      to: inputOut,
      filename: finalFilename
    }

    await download(data)
    res.json('/downloads/' + finalFilename + '.mp4')
  } catch (e) {
    console.log(e)
    res.status(500).json(e)
  }
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`server is running on http://localhost:${PORT}/`))
