import { createWorker, Worker } from 'tesseract.js'

let workerInstance: Worker | null = null

export async function getWorker(lang = 'jpn'): Promise<Worker> {
  if (workerInstance) return workerInstance
  workerInstance = await createWorker(lang, 1, {
    logger: () => {}
  })
  return workerInstance
}

export async function runOCR(
  imageSource: string | Blob | ArrayBuffer,
  lang = 'jpn',
  onProgress?: (progress: number) => void
): Promise<string> {
  const worker = await createWorker(lang, 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(Math.round(m.progress * 100))
      }
    }
  })

  try {
    const { data } = await worker.recognize(imageSource as Parameters<Worker['recognize']>[0])
    return data.text
  } finally {
    await worker.terminate()
  }
}

export async function terminateWorker(): Promise<void> {
  if (workerInstance) {
    await workerInstance.terminate()
    workerInstance = null
  }
}
