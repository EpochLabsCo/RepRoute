const DB_NAME = 'reproute-business-cards'
const DB_VERSION = 1
const STORE_NAME = 'cards'

type StoredBusinessCard = {
  prospectId: string
  blob: Blob
  mimeType: string
  capturedAt: string
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this browser.'))
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'prospectId' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Could not open business card storage.'))
  })
}

function runTransaction<T>(
  mode: IDBTransactionMode,
  handler: (store: IDBObjectStore) => IDBRequest<T>,
) {
  return openDatabase().then(
    (database) =>
      new Promise<T>((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, mode)
        const store = transaction.objectStore(STORE_NAME)
        const request = handler(store)

        request.onsuccess = () => resolve(request.result as T)
        request.onerror = () => reject(request.error ?? new Error('Business card storage request failed.'))

        transaction.oncomplete = () => database.close()
        transaction.onabort = () => {
          reject(transaction.error ?? new Error('Business card storage transaction failed.'))
          database.close()
        }
      }),
  )
}

export async function saveBusinessCardImage(prospectId: string, file: File) {
  const record: StoredBusinessCard = {
    prospectId,
    blob: file,
    mimeType: file.type || 'image/jpeg',
    capturedAt: new Date().toISOString(),
  }

  await runTransaction('readwrite', (store) => store.put(record))
  return record
}

export async function getBusinessCardBlob(prospectId: string) {
  const record = await runTransaction<StoredBusinessCard | undefined>('readonly', (store) =>
    store.get(prospectId),
  )

  return record ?? null
}

export async function getBusinessCardObjectUrl(prospectId: string) {
  const record = await getBusinessCardBlob(prospectId)
  if (!record) {
    return null
  }

  return URL.createObjectURL(record.blob)
}

export async function getBusinessCardDataUrl(prospectId: string) {
  const record = await getBusinessCardBlob(prospectId)
  if (!record) {
    return null
  }

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('Could not read business card image.'))
    reader.readAsDataURL(record.blob)
  })
}

export async function removeBusinessCardImage(prospectId: string) {
  await runTransaction('readwrite', (store) => store.delete(prospectId))
}

export async function restoreBusinessCardFromDataUrl(
  prospectId: string,
  dataUrl: string,
  mimeType = 'image/jpeg',
) {
  const response = await fetch(dataUrl)
  const blob = await response.blob()

  const record: StoredBusinessCard = {
    prospectId,
    blob,
    mimeType: mimeType || blob.type || 'image/jpeg',
    capturedAt: new Date().toISOString(),
  }

  await runTransaction('readwrite', (store) => store.put(record))
}
