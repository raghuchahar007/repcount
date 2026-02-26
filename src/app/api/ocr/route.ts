import { NextRequest, NextResponse } from 'next/server'

// Simple regex patterns to extract names and phone numbers from OCR text
function extractMembers(text: string): { name: string; phone: string }[] {
  const members: { name: string; phone: string }[] = []
  const lines = text.split('\n').filter(l => l.trim())

  // Phone pattern: 10 digits, possibly with +91 or 0 prefix
  const phoneRegex = /(?:\+?91[\s-]?)?(?:0)?([6-9]\d{9})/g

  for (const line of lines) {
    const phones = [...line.matchAll(phoneRegex)]
    if (phones.length > 0) {
      // Remove phone number to get name
      let name = line
      phones.forEach(p => { name = name.replace(p[0], '') })
      name = name.replace(/[^a-zA-Z\s\u0900-\u097F]/g, '').trim() // Keep letters and Hindi chars

      if (name && name.length >= 2) {
        members.push({
          name: name.trim(),
          phone: phones[0][1], // 10-digit number
        })
      }
    }
  }

  return members
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const image = formData.get('image') as File

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    // For MVP: Use Tesseract.js on the server
    // In production, you'd use Google Cloud Vision API
    // For now, we'll try a simpler approach

    // Convert to base64 for processing
    const bytes = await image.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')

    // Try to use Tesseract.js (server-side)
    let extractedText = ''

    try {
      // Dynamic import to avoid build issues
      const Tesseract = await import('tesseract.js')
      const worker = await Tesseract.createWorker('eng+hin')
      const { data } = await worker.recognize(`data:${image.type};base64,${base64}`)
      extractedText = data.text
      await worker.terminate()
    } catch {
      // Fallback: return empty with instructions
      return NextResponse.json({
        members: [],
        raw_text: '',
        message: 'OCR processing unavailable. Please add members manually or install tesseract.js.'
      })
    }

    const members = extractMembers(extractedText)

    return NextResponse.json({
      members,
      raw_text: extractedText,
      count: members.length,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'OCR processing failed' }, { status: 500 })
  }
}
