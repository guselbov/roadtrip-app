'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { nanoid } from 'nanoid'

export default function Home() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: '',
    creator_email: '',
    date_start: '',
    date_end: '',
  })

  async function createRoadtrip(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const slug = nanoid(8)
    const { error } = await supabase.from('roadtrips').insert({
      slug,
      title: form.title,
      creator_email: form.creator_email,
      date_start: form.date_start || null,
      date_end: form.date_end || null,
    })
    if (error) {
      alert('Erreur : ' + error.message)
      setLoading(false)
      return
    }
    router.push(`/trip/${slug}`)
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="text-4xl mb-3">🌊</div>
          <h1 className="text-3xl font-bold mb-2">RoadTrip</h1>
          <p className="text-gray-400">Organise ton trip, partage le lien, tes potes s'inscrivent.</p>
        </div>
        <form onSubmit={createRoadtrip} className="bg-gray-900 rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Nom du roadtrip *
            </label>
            <input
              type="text"
              required
              placeholder="ex : Sud-Ouest juillet 2026"
              value={form.title}
              onChange={e => setForm({...form, title: e.target.value})}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Ton email *
            </label>
            <input
              type="email"
              required
              placeholder="ex : augustin@gmail.com"
              value={form.creator_email}
              onChange={e => setForm({...form, creator_email: e.target.value})}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Date début</label>
              <input
                type="date"
                value={form.date_start}
                onChange={e => setForm({...form, date_start: e.target.value})}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Date fin</label>
              <input
                type="date"
                value={form.date_end}
                onChange={e => setForm({...form, date_end: e.target.value})}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {loading ? 'Création...' : 'Créer mon roadtrip'}
          </button>
        </form>
      </div>
    </main>
  )
}