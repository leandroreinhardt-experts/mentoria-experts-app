'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { CheckCircle2, ChevronDown, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Dados dos dropdowns ────────────────────────────────────────────────────
const CONCURSOS = [
  'PP-RS - Téc. Superior Penitenciário', 'TRT - AJAJ', 'ALE-RJ - Especialista Legislativo IV',
  'TJ-BA - AJAA', 'Câmara dos Deputados - Técnico Legislativo', 'TJ - TJAA/AJAA', 'TJ - AJAJ',
  'TJ-RJ - AJSE', 'ALE-RO - Consultor Legislativo', 'Câmara Municipal de Goiânia - Psicólogo',
  'Valec/INFRA - Analista Administrativo', 'MP-AL - Analista Área Jurídica', 'ENAM',
  'Magistratura/MP', 'Polícia Penal RS/Policial Penal', 'Câmara dos Deputados - Policial Legislativo',
  'SEMA-Analista Ambiental', 'TJ-BA - AJAJ', 'TJ - AJAJ/TJAA', 'PGE - Analista Jurídico',
  'TJ-MG - Oficial Judiciário', 'TRT - AJAJ/TJAA', 'TJ-SP - Escrevente', 'TRT - AJAA/TJAA',
  'UFAM - Assistente Administrativo', 'PC-SC - Agente', 'MP-ES - Agente de Apoio - Função Administrativa',
  'Tribunais/MP', 'Outros',
]

const CURSOS = [
  'Gran', 'Estratégia', 'Ceisc', 'Estratégia Carreiras Jurídicas',
  'Fernanda Barboza', 'PPG', 'Prepara', 'FUC Ciclos', 'Brabo Concursos', 'Outros',
]

const PLATAFORMAS = ['Gran Questões', 'Q Concursos', 'Tec Concursos', 'Estratégia']

const TEMPO_ESTUDO_DIA = [
  'Menos de 2 horas', 'De 2 a 3 horas', 'De 3 a 4 horas', 'De 4 a 5 horas', 'Mais de 5 horas',
]

const TEMPO_ESTUDANDO = [
  'Começando do zero', 'Menos de 6 meses', 'De 6 meses a 2 anos', 'Mais de 2 anos',
]

const DIAS_SEMANA = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']

const PLANOS_CONTRATADOS = [
  'Start - Semestral',
  'Start - Anual',
  'Pro - Semestral',
  'Pro - Anual',
  'Elite - Semestral',
  'Elite - Anual',
]

// ── Componentes auxiliares ─────────────────────────────────────────────────
function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border-b border-gray-100 px-6 py-4">
        <h2 className="text-sm font-semibold text-indigo-900">{title}</h2>
      </div>
      <div className="p-6 space-y-5">{children}</div>
    </div>
  )
}

function FieldLabel({ label, required, hint }: { label: string; required?: boolean; hint?: string }) {
  return (
    <div className="mb-1.5">
      <label className="text-[13px] font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {hint && <p className="text-[11px] text-gray-400 mt-0.5">{hint}</p>}
    </div>
  )
}

function TextInput({
  value, onChange, placeholder = 'Inserir texto', type = 'text', error,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; error?: boolean
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        'w-full rounded-lg border px-3 py-2 text-[13px] text-gray-800 placeholder-gray-300 outline-none transition-colors',
        'focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50',
        error ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white hover:border-gray-300'
      )}
    />
  )
}

function TextArea({
  value, onChange, placeholder = 'Inserir texto', rows = 3, error,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; error?: boolean
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={cn(
        'w-full rounded-lg border px-3 py-2 text-[13px] text-gray-800 placeholder-gray-300 outline-none transition-colors resize-none',
        'focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50',
        error ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white hover:border-gray-300'
      )}
    />
  )
}

function SelectInput({
  value, onChange, options, placeholder = 'Selecionar opção...', error, searchable,
}: {
  value: string; onChange: (v: string) => void; options: string[]
  placeholder?: string; error?: boolean; searchable?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = searchable
    ? options.filter((o) => o.toLowerCase().includes(search.toLowerCase()))
    : options

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => { setOpen(!open); setSearch('') }}
        className={cn(
          'w-full flex items-center justify-between rounded-lg border px-3 py-2 text-[13px] text-left transition-colors',
          'focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 outline-none',
          value ? 'text-gray-800' : 'text-gray-300',
          error ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white hover:border-gray-300',
          open && 'border-indigo-400 ring-2 ring-indigo-50'
        )}
      >
        <span className="truncate">{value || placeholder}</span>
        <ChevronDown size={14} className={cn('flex-shrink-0 text-gray-300 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden">
          {searchable && (
            <div className="p-2 border-b border-gray-100">
              <input
                autoFocus
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Digite para pesquisar..."
                className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-[12px] outline-none focus:border-indigo-300"
              />
            </div>
          )}
          <div className="max-h-64 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-[12px] text-gray-400">Nenhuma opção encontrada</p>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => { onChange(opt); setOpen(false) }}
                  className={cn(
                    'w-full text-left px-3 py-2 text-[13px] transition-colors',
                    value === opt
                      ? 'bg-indigo-50 text-indigo-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  )}
                >
                  {opt}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function MultiSelect({
  value, onChange, options, error,
}: {
  value: string[]; onChange: (v: string[]) => void; options: string[]; error?: boolean
}) {
  const toggle = (opt: string) => {
    if (value.includes(opt)) onChange(value.filter((v) => v !== opt))
    else onChange([...value, opt])
  }
  return (
    <div className={cn('flex flex-wrap gap-2 p-3 rounded-lg border min-h-[42px]', error ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white')}>
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => toggle(opt)}
          className={cn(
            'px-3 py-1 rounded-full text-[12px] font-medium transition-colors border',
            value.includes(opt)
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

function RangeSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1.5">
      <input
        type="range"
        min={0}
        max={10}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-indigo-600"
      />
      <div className="flex justify-between text-[11px] text-gray-400">
        <span>0 — Muito baixa</span>
        <span className="font-semibold text-indigo-600">{value}</span>
        <span>10 — Excelente</span>
      </div>
    </div>
  )
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="mt-1 flex items-center gap-1 text-[11px] text-red-500"><AlertCircle size={11} />{msg}</p>
}

// ── Formulário principal ───────────────────────────────────────────────────
type FormData = {
  nome: string; cpf: string; email: string; whatsapp: string; cidadeEstado: string
  planoContratado: string
  dataInicial: string; possuiFilhos: string; nivelEscolaridade: string
  areaFormacao: string; situacaoProfissional: string; cargoAtual: string
  concursoAlmejado: string; cargoAlmejado: string; dataProva: string; cursoPrincipal: string
  plataformaQuestoes: string; motivosConcurso: string; tempoEstudoDia: string
  formaEstudo: string; dificuldadesEstudo: string; disciplinasDificuldade: string
  disciplinasEstudando: string; nivelConcentracao: number
  tempoEstudandoConcursos: string; concursosAnteriores: string; desempenhoAnterior: string
  fezMentoriaAntes: string; quaisMentorias: string; experienciaMentoria: string
  expectativa: string; rotina: string; diasEstudo: string[]; transtornos: string; observacoes: string
}

const INITIAL: FormData = {
  nome: '', cpf: '', email: '', whatsapp: '', cidadeEstado: '',
  planoContratado: '',
  dataInicial: new Date().toISOString().split('T')[0],
  possuiFilhos: '', nivelEscolaridade: '', areaFormacao: '', situacaoProfissional: '', cargoAtual: '',
  concursoAlmejado: '', cargoAlmejado: '', dataProva: '', cursoPrincipal: '', plataformaQuestoes: '',
  motivosConcurso: '', tempoEstudoDia: '', formaEstudo: '', dificuldadesEstudo: '',
  disciplinasDificuldade: '', disciplinasEstudando: '', nivelConcentracao: 5,
  tempoEstudandoConcursos: '', concursosAnteriores: '', desempenhoAnterior: '',
  fezMentoriaAntes: '', quaisMentorias: '', experienciaMentoria: '',
  expectativa: '', rotina: '', diasEstudo: [], transtornos: '', observacoes: '',
}

type Errors = Partial<Record<keyof FormData, string>>

export default function OnboardingPage() {
  const [form, setForm] = useState<FormData>(INITIAL)
  const [errors, setErrors] = useState<Errors>({})
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [serverError, setServerError] = useState('')

  const set = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }, [])

  function validate(): Errors {
    const e: Errors = {}
    if (!form.nome.trim()) e.nome = 'Campo obrigatório'
    if (!form.cpf.trim()) e.cpf = 'Campo obrigatório'
    else if (form.cpf.replace(/\D/g, '').length !== 11) e.cpf = 'CPF inválido (11 dígitos)'
    if (!form.email.trim()) e.email = 'Campo obrigatório'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'E-mail inválido'
    if (!form.whatsapp.trim()) e.whatsapp = 'Campo obrigatório'
    if (!form.cidadeEstado.trim()) e.cidadeEstado = 'Campo obrigatório'
    if (!form.planoContratado) e.planoContratado = 'Campo obrigatório'
    if (!form.possuiFilhos) e.possuiFilhos = 'Campo obrigatório'
    if (!form.nivelEscolaridade) e.nivelEscolaridade = 'Campo obrigatório'
    if (!form.areaFormacao) e.areaFormacao = 'Campo obrigatório'
    if (!form.situacaoProfissional) e.situacaoProfissional = 'Campo obrigatório'
    if (!form.concursoAlmejado.trim()) e.concursoAlmejado = 'Campo obrigatório'
    if (!form.cargoAlmejado.trim()) e.cargoAlmejado = 'Campo obrigatório'
    if (!form.cursoPrincipal) e.cursoPrincipal = 'Campo obrigatório'
    if (!form.plataformaQuestoes) e.plataformaQuestoes = 'Campo obrigatório'
    if (!form.motivosConcurso.trim()) e.motivosConcurso = 'Campo obrigatório'
    if (!form.tempoEstudoDia) e.tempoEstudoDia = 'Campo obrigatório'
    if (!form.dificuldadesEstudo.trim()) e.dificuldadesEstudo = 'Campo obrigatório'
    if (!form.disciplinasDificuldade.trim()) e.disciplinasDificuldade = 'Campo obrigatório'
    if (!form.tempoEstudandoConcursos) e.tempoEstudandoConcursos = 'Campo obrigatório'
    if (!form.fezMentoriaAntes) e.fezMentoriaAntes = 'Campo obrigatório'
    if (!form.expectativa.trim()) e.expectativa = 'Campo obrigatório'
    if (!form.rotina.trim()) e.rotina = 'Campo obrigatório'
    if (form.diasEstudo.length === 0) e.diasEstudo = 'Selecione ao menos um dia'
    return e
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      const firstError = document.querySelector('[data-error="true"]')
      firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    setLoading(true)
    setServerError('')
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setServerError(data.error || 'Erro ao enviar formulário. Tente novamente.')
        return
      }
      setSubmitted(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      setServerError('Erro de conexão. Verifique sua internet e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 shadow-xl">
              <CheckCircle2 className="h-10 w-10 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Formulário enviado!</h1>
            <p className="mt-3 text-[14px] text-gray-500 leading-relaxed">
              Obrigado(a) por preencher o formulário de onboarding. Em até{' '}
              <strong className="text-indigo-600">72 horas úteis</strong> seu plano de estudo
              será disponibilizado.
            </p>
            <p className="mt-3 text-[13px] text-gray-400 leading-relaxed">
              Enquanto isso, recomendo que assista com calma todas as aulas do{' '}
              <strong>Método Ultra-Aprendizado</strong> e aprenda a metodologia para estudar em
              alto desempenho.
            </p>
          </div>
          <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-[13px] text-indigo-700">
            🚀 Vamos juntos rumo à sua aprovação!
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Image src="/logo.png" alt="Mentoria Experts" width={36} height={36} className="rounded-xl shadow-md flex-shrink-0" />
          <div>
            <p className="text-[14px] font-bold text-gray-900 leading-tight">Mentoria Experts</p>
            <p className="text-[11px] text-gray-400">Formulário de Onboarding</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Intro */}
        <div className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm space-y-3">
          <h1 className="text-xl font-bold text-gray-900">🧠 Formulário de Onboarding</h1>
          <div className="space-y-2 text-[13px] text-gray-600 leading-relaxed">
            <p>
              🚨 <strong>Preencha-o com a maior riqueza de detalhes possível</strong>, isso servirá
              para que possamos personalizar ao máximo seu planejamento e acompanhamento.
            </p>
            <p>
              Nosso objetivo é <strong>ajudar você a estudar com alto desempenho e conquistar
              sua aprovação</strong>. Para isso, precisamos entender um pouco mais sobre o seu
              perfil, hábitos e os desafios que enfrenta nos estudos.
            </p>
            <p>
              Após o preenchimento, em até <strong className="text-indigo-600">72 horas úteis</strong>,
              seu plano de estudo será disponibilizado. Enquanto isso, recomendo que assista com
              calma todas as aulas do <strong>Método Ultra-Aprendizado</strong> e aprenda muito bem
              a metodologia para estudar em alto desempenho.
            </p>
            <p className="text-[12px] text-gray-400 border-t border-gray-100 pt-2 mt-2">
              Obs: todas as informações desse formulário são confidenciais e somente serão
              acessadas pela equipe da Mentoria, garantida a proteção dos seus dados pessoais.
            </p>
          </div>
        </div>

        {serverError && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
            <AlertCircle size={16} />
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ── DADOS PESSOAIS ─────────────────────────────────────────────── */}
          <FormSection title="🧑🏽‍💻 DADOS PESSOAIS">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2" data-error={!!errors.nome}>
                <FieldLabel label="Nome completo" required />
                <TextInput value={form.nome} onChange={(v) => set('nome', v)} error={!!errors.nome} />
                <FieldError msg={errors.nome} />
              </div>

              <div data-error={!!errors.cpf}>
                <FieldLabel label="🪪 CPF" required />
                <TextInput value={form.cpf} onChange={(v) => set('cpf', v)} placeholder="000.000.000-00" error={!!errors.cpf} />
                <FieldError msg={errors.cpf} />
              </div>

              <div data-error={!!errors.email}>
                <FieldLabel label="E-mail" required hint="Usaremos para envio de relatórios e informações." />
                <TextInput value={form.email} onChange={(v) => set('email', v)} type="email" placeholder="seu@email.com" error={!!errors.email} />
                <FieldError msg={errors.email} />
              </div>

              <div data-error={!!errors.cidadeEstado}>
                <FieldLabel label="Cidade e Estado" required />
                <TextInput value={form.cidadeEstado} onChange={(v) => set('cidadeEstado', v)} placeholder="Ex: São Paulo - SP" error={!!errors.cidadeEstado} />
                <FieldError msg={errors.cidadeEstado} />
              </div>

              <div>
                <FieldLabel label="Data inicial" required hint="Data de hoje." />
                <TextInput value={form.dataInicial} onChange={(v) => set('dataInicial', v)} type="date" />
              </div>

              <div data-error={!!errors.whatsapp}>
                <FieldLabel label="Whatsapp" required />
                <TextInput value={form.whatsapp} onChange={(v) => set('whatsapp', v)} placeholder="(11) 99999-9999" error={!!errors.whatsapp} />
                <FieldError msg={errors.whatsapp} />
              </div>

              <div className="col-span-2" data-error={!!errors.planoContratado}>
                <FieldLabel label="Plano contratado" required hint="Selecione o plano que você adquiriu." />
                <SelectInput
                  value={form.planoContratado}
                  onChange={(v) => set('planoContratado', v)}
                  options={PLANOS_CONTRATADOS}
                  placeholder="Selecione seu plano..."
                  error={!!errors.planoContratado}
                />
                <FieldError msg={errors.planoContratado} />
              </div>

              <div data-error={!!errors.possuiFilhos}>
                <FieldLabel label="Possui filho(s)?" required />
                <SelectInput
                  value={form.possuiFilhos}
                  onChange={(v) => set('possuiFilhos', v)}
                  options={['Sim', 'Não']}
                  error={!!errors.possuiFilhos}
                />
                <FieldError msg={errors.possuiFilhos} />
              </div>

              <div data-error={!!errors.nivelEscolaridade}>
                <FieldLabel label="Nível de escolaridade" required />
                <SelectInput
                  value={form.nivelEscolaridade}
                  onChange={(v) => set('nivelEscolaridade', v)}
                  options={['Ensino Médio', 'Ensino Superior Incompleto', 'Ensino Superior Completo', 'Pós-graduação']}
                  error={!!errors.nivelEscolaridade}
                />
                <FieldError msg={errors.nivelEscolaridade} />
              </div>

              <div data-error={!!errors.areaFormacao}>
                <FieldLabel label="Área de formação" required />
                <SelectInput
                  value={form.areaFormacao}
                  onChange={(v) => set('areaFormacao', v)}
                  options={['Direito', 'Administração', 'Contabilidade', 'Enfermagem', 'Ciências Exatas', 'Ciências Humanas', 'Ciências Biológicas', 'Engenharia', 'Tecnologia da Informação', 'Segurança Pública', 'Outra']}
                  error={!!errors.areaFormacao}
                />
                <FieldError msg={errors.areaFormacao} />
              </div>

              <div data-error={!!errors.situacaoProfissional}>
                <FieldLabel label="Situação profissional" required />
                <SelectInput
                  value={form.situacaoProfissional}
                  onChange={(v) => set('situacaoProfissional', v)}
                  options={['Desempregado', 'CLT', 'Autônomo', 'Servidor Público', 'Estudante']}
                  error={!!errors.situacaoProfissional}
                />
                <FieldError msg={errors.situacaoProfissional} />
              </div>

              <div className="col-span-2">
                <FieldLabel label="Cargo atual" />
                <TextInput value={form.cargoAtual} onChange={(v) => set('cargoAtual', v)} placeholder="Seu cargo atual (se aplicável)" />
              </div>
            </div>
          </FormSection>

          {/* ── OBJETIVO NO ESTUDO ─────────────────────────────────────────── */}
          <FormSection title="🖋️ Sobre seu objetivo no estudo">
            <p className="text-[12px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              Tenha muita atenção e seja bastante <strong>específico(a)</strong> sobre o concurso
              e o cargo almejado — essas informações serão usadas para elaboração do seu plano.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2" data-error={!!errors.concursoAlmejado}>
                <FieldLabel label="Qual concurso almejado?" required />
                <TextInput
                  value={form.concursoAlmejado}
                  onChange={(v) => set('concursoAlmejado', v)}
                  placeholder="Ex: Tribunal de Justiça de SP, TRT 2ª Região..."
                  error={!!errors.concursoAlmejado}
                />
                <FieldError msg={errors.concursoAlmejado} />
              </div>

              <div className="col-span-2" data-error={!!errors.cargoAlmejado}>
                <FieldLabel label="Informe o cargo desejado:" required />
                <TextInput
                  value={form.cargoAlmejado}
                  onChange={(v) => set('cargoAlmejado', v)}
                  placeholder="Ex: Analista Judiciário - Área Judiciária, Escrevente..."
                  error={!!errors.cargoAlmejado}
                />
                <FieldError msg={errors.cargoAlmejado} />
              </div>

              <div className="col-span-2">
                <FieldLabel label="Sua prova já tem data? Se sim, insira o dia" />
                <TextInput value={form.dataProva} onChange={(v) => set('dataProva', v)} type="date" />
              </div>

              <div data-error={!!errors.cursoPrincipal}>
                <FieldLabel label="Qual curso você irá utilizar como base?" required hint='Caso não esteja na lista, selecione "Outros".' />
                <SelectInput
                  value={form.cursoPrincipal}
                  onChange={(v) => set('cursoPrincipal', v)}
                  options={CURSOS}
                  error={!!errors.cursoPrincipal}
                />
                <FieldError msg={errors.cursoPrincipal} />
              </div>

              <div data-error={!!errors.plataformaQuestoes}>
                <FieldLabel label="Qual plataforma de questões você utiliza?" required />
                <SelectInput
                  value={form.plataformaQuestoes}
                  onChange={(v) => set('plataformaQuestoes', v)}
                  options={PLATAFORMAS}
                  error={!!errors.plataformaQuestoes}
                />
                <FieldError msg={errors.plataformaQuestoes} />
              </div>

              <div className="col-span-2" data-error={!!errors.motivosConcurso}>
                <FieldLabel label="Quais os motivos pelos quais você deseja se tornar concursado(a)?" required />
                <TextArea value={form.motivosConcurso} onChange={(v) => set('motivosConcurso', v)} error={!!errors.motivosConcurso} rows={3} />
                <FieldError msg={errors.motivosConcurso} />
              </div>

              <div data-error={!!errors.tempoEstudoDia}>
                <FieldLabel label="Quanto tempo por dia você irá dedicar ao estudo?" required />
                <SelectInput
                  value={form.tempoEstudoDia}
                  onChange={(v) => set('tempoEstudoDia', v)}
                  options={TEMPO_ESTUDO_DIA}
                  error={!!errors.tempoEstudoDia}
                />
                <FieldError msg={errors.tempoEstudoDia} />
              </div>

              <div>
                <FieldLabel label="Qual sua forma de estudo preferida?" />
                <TextInput value={form.formaEstudo} onChange={(v) => set('formaEstudo', v)} placeholder="Ex: vídeo-aulas, resumos, questões..." />
              </div>

              <div className="col-span-2" data-error={!!errors.dificuldadesEstudo}>
                <FieldLabel label="Explique as maiores dificuldades que você tem no estudo" required />
                <TextArea value={form.dificuldadesEstudo} onChange={(v) => set('dificuldadesEstudo', v)} error={!!errors.dificuldadesEstudo} rows={3} />
                <FieldError msg={errors.dificuldadesEstudo} />
              </div>

              <div className="col-span-2" data-error={!!errors.disciplinasDificuldade}>
                <FieldLabel label="Liste as disciplinas que você considera ter mais dificuldade" required />
                <TextArea value={form.disciplinasDificuldade} onChange={(v) => set('disciplinasDificuldade', v)} error={!!errors.disciplinasDificuldade} rows={2} />
                <FieldError msg={errors.disciplinasDificuldade} />
              </div>

              <div className="col-span-2">
                <FieldLabel label="Caso seu estudo esteja em andamento, informe quais disciplinas você vem estudando atualmente" />
                <TextArea value={form.disciplinasEstudando} onChange={(v) => set('disciplinasEstudando', v)} rows={2} />
              </div>

              <div className="col-span-2">
                <FieldLabel label="Como você avalia seu nível de concentração durante o estudo?" required />
                <RangeSlider value={form.nivelConcentracao} onChange={(v) => set('nivelConcentracao', v)} />
              </div>
            </div>
          </FormSection>

          {/* ── EXPERIÊNCIAS ANTERIORES ────────────────────────────────────── */}
          <FormSection title="⌛️ Experiências Anteriores">
            <div className="grid grid-cols-2 gap-4">
              <div data-error={!!errors.tempoEstudandoConcursos}>
                <FieldLabel label="Há quanto tempo estuda para concursos?" required />
                <SelectInput
                  value={form.tempoEstudandoConcursos}
                  onChange={(v) => set('tempoEstudandoConcursos', v)}
                  options={TEMPO_ESTUDANDO}
                  error={!!errors.tempoEstudandoConcursos}
                />
                <FieldError msg={errors.tempoEstudandoConcursos} />
              </div>

              <div>
                <FieldLabel label="Liste os concursos que já prestou" />
                <TextInput value={form.concursosAnteriores} onChange={(v) => set('concursosAnteriores', v)} placeholder="Ex: TJSP 2023, TRF 2022..." />
              </div>

              <div className="col-span-2">
                <FieldLabel label="Como foi seu desempenho em provas anteriores? Houve alguma aprovação?" />
                <TextArea value={form.desempenhoAnterior} onChange={(v) => set('desempenhoAnterior', v)} rows={2} />
              </div>

              <div data-error={!!errors.fezMentoriaAntes}>
                <FieldLabel label="Já fez mentoria ou consultoria anteriormente?" required />
                <SelectInput
                  value={form.fezMentoriaAntes}
                  onChange={(v) => set('fezMentoriaAntes', v)}
                  options={['Não', 'Sim']}
                  error={!!errors.fezMentoriaAntes}
                />
                <FieldError msg={errors.fezMentoriaAntes} />
              </div>

              {form.fezMentoriaAntes === 'Sim' && (
                <div>
                  <FieldLabel label="Caso positivo, cite a(s) mentoria(s) de que participou:" />
                  <TextInput value={form.quaisMentorias} onChange={(v) => set('quaisMentorias', v)} />
                </div>
              )}

              <div className="col-span-2">
                <FieldLabel label="Se positivo, como foi sua experiência?" />
                <TextArea value={form.experienciaMentoria} onChange={(v) => set('experienciaMentoria', v)} rows={2} placeholder="Descreva sua experiência com a mentoria ou consultoria anterior..." />
              </div>

              <div className="col-span-2" data-error={!!errors.expectativa}>
                <FieldLabel label="O que você espera da Mentoria Experts para que você sinta que valeu a pena?" required />
                <TextArea value={form.expectativa} onChange={(v) => set('expectativa', v)} error={!!errors.expectativa} rows={3} />
                <FieldError msg={errors.expectativa} />
              </div>
            </div>
          </FormSection>

          {/* ── ROTINA E HÁBITOS ───────────────────────────────────────────── */}
          <FormSection title="🚴🏻 Rotina e Hábitos">
            <p className="text-[12px] text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
              Nessa seção quero saber em detalhes sobre seus hábitos, rotina, passatempos,
              compromissos e responsabilidades.
            </p>

            <div className="space-y-5">
              <div data-error={!!errors.rotina}>
                <FieldLabel label="Descreva sua rotina" required />
                <TextArea value={form.rotina} onChange={(v) => set('rotina', v)} error={!!errors.rotina} rows={4} placeholder="Descreva seu dia a dia, horários, compromissos, etc." />
                <FieldError msg={errors.rotina} />
              </div>

              <div data-error={!!errors.diasEstudo}>
                <FieldLabel label="Quais os dias da semana que você irá estudar?" required />
                <MultiSelect value={form.diasEstudo} onChange={(v) => set('diasEstudo', v)} options={DIAS_SEMANA} error={!!errors.diasEstudo} />
                <FieldError msg={errors.diasEstudo} />
              </div>

              <div>
                <FieldLabel
                  label="Possui algum transtorno, patologia ou vício que possa afetar seu rendimento nos estudos?"
                  hint="Se sim, descreva em detalhes, inclusive se faz algum tipo de tratamento."
                />
                <TextArea value={form.transtornos} onChange={(v) => set('transtornos', v)} rows={3} />
              </div>

              <div>
                <FieldLabel label="Tem algo mais que você considere importante informar?" />
                <TextArea value={form.observacoes} onChange={(v) => set('observacoes', v)} rows={3} />
              </div>
            </div>
          </FormSection>

          {/* ── Enviar ────────────────────────────────────────────────────── */}
          <button
            type="submit"
            disabled={loading}
            className={cn(
              'w-full rounded-xl py-3.5 text-[14px] font-semibold text-white transition-all',
              'bg-gradient-to-r from-violet-600 to-indigo-600 shadow-lg shadow-indigo-200',
              'hover:from-violet-700 hover:to-indigo-700 hover:shadow-indigo-300',
              'disabled:opacity-60 disabled:cursor-not-allowed'
            )}
          >
            {loading ? 'Enviando...' : 'Enviar formulário'}
          </button>

          <p className="text-center text-[11px] text-gray-400 pb-4">
            Suas informações são confidenciais e protegidas pela equipe da Mentoria Experts.
          </p>
        </form>
      </div>
    </div>
  )
}
