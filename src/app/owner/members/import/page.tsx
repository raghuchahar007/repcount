'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'

interface ExtractedMember {
  name: string
  phone: string
  selected: boolean
}

export default function ImportMembersPage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<'upload' | 'review' | 'importing'>('upload')
  const [image, setImage] = useState<string | null>(null)
  const [extractedMembers, setExtractedMembers] = useState<ExtractedMember[]>([])
  const [processing, setProcessing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')
  const [importResult, setImportResult] = useState<{ added: number; skipped: number } | null>(null)

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Show preview
    const reader = new FileReader()
    reader.onload = (ev) => setImage(ev.target?.result as string)
    reader.readAsDataURL(file)

    // Process with OCR
    setProcessing(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('image', file)

      const res = await fetch('/api/ocr', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'OCR failed')

      setExtractedMembers(data.members.map((m: any) => ({ ...m, selected: true })))
      setStep('review')
    } catch (err: any) {
      setError(err.message || 'Failed to extract text. Try a clearer photo.')
    } finally {
      setProcessing(false)
    }
  }

  const updateMember = (index: number, field: keyof ExtractedMember, value: string | boolean) => {
    setExtractedMembers(prev => prev.map((m, i) => i === index ? { ...m, [field]: value } : m))
  }

  const addBlankRow = () => {
    setExtractedMembers(prev => [...prev, { name: '', phone: '', selected: true }])
  }

  const handleImport = async () => {
    const toImport = extractedMembers.filter(m => m.selected && m.name.trim() && m.phone.replace(/\D/g, '').length === 10)
    if (toImport.length === 0) return setError('No valid members to import')

    setImporting(true)
    setStep('importing')
    setError('')

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: gym } = await supabase
        .from('gyms').select('id').eq('owner_id', user.id).single()
      if (!gym) throw new Error('No gym found')

      const membersToInsert = toImport.map(member => ({
        gym_id: gym.id,
        name: member.name.trim(),
        phone: member.phone.replace(/\D/g, ''),
      }))

      const { data: inserted, error: batchError } = await supabase
        .from('members')
        .upsert(membersToInsert, { onConflict: 'phone,gym_id', ignoreDuplicates: true })
        .select()

      if (batchError) throw new Error(batchError.message)

      const added = inserted?.length || 0
      const skipped = toImport.length - added

      setImportResult({ added, skipped })
    } catch (err: any) {
      setError(err.message || 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="p-4 space-y-4">
      <button onClick={() => router.back()} className="text-text-secondary text-sm min-h-[44px] inline-flex items-center">← Back</button>
      <h2 className="text-lg font-bold text-text-primary">Import from Register</h2>
      <p className="text-xs text-text-secondary">
        Take a photo of your member register — we'll extract names and phone numbers automatically.
      </p>

      {step === 'upload' && (
        <>
          <Card
            className="p-8 border-dashed border-2 border-border text-center cursor-pointer"
            onClick={() => fileRef.current?.click()}
          >
            {image ? (
              <img src={image} alt="Register" className="max-h-48 mx-auto rounded-lg" />
            ) : (
              <>
                <span className="text-4xl">📷</span>
                <p className="text-text-secondary text-sm mt-2">
                  Tap to take photo or upload image
                </p>
                <p className="text-text-muted text-[11px] mt-1">
                  Supports JPG, PNG up to 10MB
                </p>
              </>
            )}
          </Card>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageSelect}
            className="hidden"
          />
          {processing && (
            <div className="text-center py-4">
              <div className="animate-spin h-8 w-8 border-2 border-accent-orange border-t-transparent rounded-full mx-auto" />
              <p className="text-text-secondary text-sm mt-2">Reading register...</p>
            </div>
          )}

          {/* Manual entry option */}
          <div className="text-center">
            <button
              onClick={() => {
                setExtractedMembers([
                  { name: '', phone: '', selected: true },
                  { name: '', phone: '', selected: true },
                  { name: '', phone: '', selected: true },
                ])
                setStep('review')
              }}
              className="text-accent-orange text-sm"
            >
              Or enter manually
            </button>
          </div>
        </>
      )}

      {step === 'review' && (
        <>
          <p className="text-xs text-text-secondary">
            Review extracted data. Uncheck rows to skip.
          </p>
          <div className="space-y-2">
            {extractedMembers.map((member, i) => (
              <Card key={i} className="p-3 flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={member.selected}
                  onChange={(e) => updateMember(i, 'selected', e.target.checked)}
                  className="mt-2 accent-accent-orange"
                />
                <div className="flex-1 space-y-2">
                  <input
                    placeholder="Name"
                    value={member.name}
                    onChange={(e) => updateMember(i, 'name', e.target.value)}
                    className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-orange focus:outline-none"
                  />
                  <input
                    placeholder="Phone (10 digits)"
                    value={member.phone}
                    onChange={(e) => updateMember(i, 'phone', e.target.value)}
                    type="tel"
                    maxLength={10}
                    className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-orange focus:outline-none"
                  />
                </div>
              </Card>
            ))}
          </div>

          <Button variant="ghost" size="sm" onClick={addBlankRow}>
            + Add Row
          </Button>

          {error && <p className="text-status-red text-xs text-center">{error}</p>}

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setStep('upload'); setImage(null) }} className="flex-1">
              Re-scan
            </Button>
            <Button onClick={handleImport} loading={importing} className="flex-1">
              Import {extractedMembers.filter(m => m.selected).length} Members
            </Button>
          </div>
        </>
      )}

      {step === 'importing' && importResult && (
        <Card className="p-6 text-center">
          <span className="text-4xl">✅</span>
          <p className="text-text-primary font-bold text-lg mt-2">Import Complete</p>
          <p className="text-status-green text-sm mt-1">{importResult.added} members added</p>
          {importResult.skipped > 0 && (
            <p className="text-status-yellow text-xs mt-1">{importResult.skipped} skipped (duplicates)</p>
          )}
          <Button onClick={() => router.push('/owner/members')} className="mt-4">
            View Members
          </Button>
        </Card>
      )}
    </div>
  )
}
