import { supabase } from '@/lib/supabase'

export default async function Home() {
  const { error } = await supabase.from('roadtrips').select('*')
  
  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-4">🌊 RoadTrip App</h1>
      <p className="text-gray-500">
        ✅ Supabase connecté !
      </p>
    </main>
  )
}