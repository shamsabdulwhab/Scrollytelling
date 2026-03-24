import * as tf from '@tensorflow/tfjs'

export type FaceApiAgeGender = {
  age: number
  gender: 'female' | 'male'
  genderProbability: number
}

type FaceApiModule = typeof import('@vladmandic/face-api')

let faceapiModule: FaceApiModule | null = null
let loadPromise: Promise<void> | null = null

function modelBaseUri(): string {
  return `${import.meta.env.BASE_URL}models/face-api`.replace(/\/$/, '')
}

async function getFaceApi(): Promise<FaceApiModule> {
  if (!faceapiModule) {
    faceapiModule = await import('@vladmandic/face-api')
  }
  return faceapiModule
}

/** Loads TinyFaceDetector + AgeGenderNet once (served from `public/models/face-api`). */
export function ensureFaceApiModelsLoaded(): Promise<void> {
  if (loadPromise) return loadPromise
  loadPromise = (async () => {
    await tf.ready()
    const faceapi = await getFaceApi()
    const uri = modelBaseUri()
    await faceapi.nets.tinyFaceDetector.loadFromUri(uri)
    await faceapi.nets.ageGenderNet.loadFromUri(uri)
  })()
  return loadPromise
}

/**
 * Age + binary gender from a neural model (female/male only). Can disagree with identity;
 * use the form Gender field for salary.
 */
export async function predictAgeGenderFromCanvas(
  canvas: HTMLCanvasElement,
): Promise<FaceApiAgeGender | null> {
  await ensureFaceApiModelsLoaded()
  const faceapi = await getFaceApi()
  const detection = await faceapi
    .detectSingleFace(
      canvas,
      new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.45 }),
    )
    .withAgeAndGender()
    .run()

  if (!detection) return null

  const gender: 'female' | 'male' =
    detection.gender === faceapi.Gender.FEMALE ? 'female' : 'male'

  return {
    age: detection.age,
    gender,
    genderProbability: detection.genderProbability,
  }
}
