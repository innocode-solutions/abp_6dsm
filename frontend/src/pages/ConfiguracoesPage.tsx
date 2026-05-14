import { Bell, Lock, Mail, Shield } from 'lucide-react'

export function ConfiguracoesPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 pb-4">
      <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-[#2563EB]">
            <Mail className="size-5" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-[#0D1B4B]">Notificações por e-mail</h2>
            <p className="mt-1 text-xs text-slate-500">
              Receba alertas sobre mensagens não entendidas e picos de atendimento.
            </p>
            <div className="mt-4 space-y-3">
              <ToggleRow label="Resumo diário" defaultOn />
              <ToggleRow label="Alertas críticos" defaultOn />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-[#2563EB]">
            <Shield className="size-5" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-[#0D1B4B]">Segurança</h2>
            <p className="mt-1 text-xs text-slate-500">
              Boas práticas de acesso ao painel (mock — sem integração).
            </p>
            <div className="mt-4 space-y-3">
              <label className="block text-xs font-medium text-slate-600">
                Tempo de sessão (minutos)
                <input
                  type="number"
                  defaultValue={60}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/25"
                />
              </label>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-[#2563EB]">
            <Lock className="size-5" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-[#0D1B4B]">Alterar senha</h2>
            <p className="mt-1 text-xs text-slate-500">Campos apenas ilustrativos.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-medium text-slate-600">
                Nova senha
                <input
                  type="password"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/25"
                />
              </label>
              <label className="block text-xs font-medium text-slate-600">
                Confirmar
                <input
                  type="password"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/25"
                />
              </label>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-[#2563EB]">
            <Bell className="size-5" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-[#0D1B4B]">Som e desktop</h2>
            <div className="mt-4">
              <ToggleRow label="Tocar som ao receber nova conversa" />
            </div>
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          className="rounded-xl bg-[#0D1B4B] px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#152a6e]"
        >
          Salvar preferências
        </button>
      </div>
    </div>
  )
}

function ToggleRow({ label, defaultOn }: { label: string; defaultOn?: boolean }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input type="checkbox" defaultChecked={defaultOn} className="size-4 accent-[#2563EB]" />
    </label>
  )
}
