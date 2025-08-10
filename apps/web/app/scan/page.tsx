'use client'
import { BrowserMultiFormatReader } from '@zxing/browser'

export default function ScanPage() {
  const startScan = async () => {
    const codeReader = new BrowserMultiFormatReader()
    try {
      const result = await codeReader.decodeFromVideoDevice(undefined, 'video', (r) => {
        if (r) {
          alert('QR: ' + r.getText())
          window.location.href = '/tickets'
        }
      })
    } catch (e:any) {
      alert(e.message)
    }
  }
  return (
    <main>
      <h2>Scan (Web)</h2>
      <video id="video" style={{ width: 360, height: 240, background:'#000' }} />
      <div><button onClick={startScan}>Iniciar cámara</button></div>
    </main>
  )
}
