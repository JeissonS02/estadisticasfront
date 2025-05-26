"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { CalendarDays, Download, FileText, BarChart3, PieChart, TrendingUp } from "lucide-react"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import Image from "next/image"
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Line,
  LineChart,
} from "recharts"

interface EstadisticasData {
  asistencia: {
    atendidos: number
    noAtendidos: number
  }
  participacion: {
    estudiantes: number
    docentes: number
    administrativos: number
    serviciosGenerales: number
  }
  tendenciasMensuales: {
    mes: string
    cantidad: number
  }[]
}

const tiposUsuario = [
  { value: "student", label: "Estudiante" },
  { value: "teacher", label: "Docente" },
  { value: "admin", label: "Administrativo" },
  { value: "services", label: "Servicios Generales" },
]

const COLORS = [
  "hsl(142, 76%, 36%)", // Verde para atendidos
  "hsl(0, 84%, 60%)", // Rojo para no atendidos
  "hsl(48, 96%, 53%)", // Amarillo para tardanza
  "hsl(221, 83%, 53%)", // Azul para adicional
]

export default function EstadisticasTurnos() {
  const [tipoUsuario, setTipoUsuario] = useState<string>("all")
  const [fechaInicio, setFechaInicio] = useState<string>("")
  const [fechaFin, setFechaFin] = useState<string>("")
  const [estadisticas, setEstadisticas] = useState<EstadisticasData | null>(null)
  const [loading, setLoading] = useState(false)

  const baseUrl = "https://estadistica-api-ehfdg9b8cfgnfdfb.canadacentral-01.azurewebsites.net/api/estadisticas"

  const construirParametros = () => {
    const params = new URLSearchParams()
    if (tipoUsuario !== "all") params.append("tipoUsuario", tipoUsuario)
    if (fechaInicio) params.append("fechaInicio", fechaInicio)
    if (fechaFin) params.append("fechaFin", fechaFin)
    return params.toString()
  }

  const generarEstadisticas = async () => {
    setLoading(true)
    try {
      const parametros = construirParametros()
      const url = `${baseUrl}/turnos/filtrar${parametros ? `?${parametros}` : ""}`

      const response = await fetch(url)
      if (!response.ok) throw new Error("Error al obtener estadísticas")

      const data = await response.json()

      // Procesar datos reales de la API
      const procesarEstadisticas = (registros: any[]) => {
        // 1. Calcular asistencia: atendidos vs no atendidos
        let totalInscritos = 0
        let totalAtendidos = 0

        registros.forEach((registro) => {
          totalInscritos += registro.inscritos || 0
          totalAtendidos += registro.atendidos || 0
        })

        const totalNoAtendidos = totalInscritos - totalAtendidos

        // 2. Calcular participación por tipo de usuario
        const participacionPorTipo = registros.reduce(
          (acc, registro) => {
            const tipo = registro.tipoUsuario?.toLowerCase()
            if (tipo === "student") acc.estudiantes += registro.inscritos || 0
            else if (tipo === "teacher") acc.docentes += registro.inscritos || 0
            else if (tipo === "admin") acc.administrativos += registro.inscritos || 0
            else if (tipo === "services") acc.serviciosGenerales += registro.inscritos || 0
            return acc
          },
          { estudiantes: 0, docentes: 0, administrativos: 0, serviciosGenerales: 0 },
        )

        // 3. Calcular tendencias mensuales
        const tendenciasPorMes = registros.reduce(
          (acc, registro) => {
            const fecha = new Date(registro.fechaActividad)
            const mes = fecha.toLocaleDateString("es-ES", { month: "long" })
            const mesCapitalizado = mes.charAt(0).toUpperCase() + mes.slice(1)

            if (!acc[mesCapitalizado]) acc[mesCapitalizado] = 0
            acc[mesCapitalizado] += registro.inscritos || 0
            return acc
          },
          {} as Record<string, number>,
        )

        const tendenciasMensuales = Object.entries(tendenciasPorMes).map(([mes, cantidad]) => ({
          mes,
          cantidad,
        }))

        return {
          asistencia: {
            atendidos: totalAtendidos,
            noAtendidos: Math.max(0, totalNoAtendidos),
          },
          participacion: participacionPorTipo,
          tendenciasMensuales,
        }
      }

      const estadisticasProcesadas = procesarEstadisticas(data)
      setEstadisticas(estadisticasProcesadas)
    } catch (error) {
      console.error("Error:", error)
      alert("Error al generar estadísticas: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  const exportarExcel = async () => {
    try {
      const parametros = construirParametros()
      const url = `${baseUrl}/turnos/export/excel${parametros ? `?${parametros}` : ""}`

      const response = await fetch(url)
      if (!response.ok) throw new Error("Error al exportar Excel")

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = downloadUrl
      link.download = `estadisticas_turnos_${new Date().toISOString().split("T")[0]}.xlsx`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(downloadUrl)
    } catch (error) {
      console.error("Error:", error)
      alert("Error al exportar Excel")
    }
  }

  const exportarPDF = async () => {
    try {
      const parametros = construirParametros()
      const url = `${baseUrl}/turnos/export/pdf${parametros ? `?${parametros}` : ""}`

      const response = await fetch(url)
      if (!response.ok) throw new Error("Error al exportar PDF")

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = downloadUrl
      link.download = `estadisticas_turnos_${new Date().toISOString().split("T")[0]}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(downloadUrl)
    } catch (error) {
      console.error("Error:", error)
      alert("Error al exportar PDF")
    }
  }

  const datosAsistencia = estadisticas
    ? [
        { name: "Atendidos", value: estadisticas.asistencia.atendidos, color: COLORS[0] },
        { name: "No Atendidos", value: estadisticas.asistencia.noAtendidos, color: COLORS[1] },
      ]
    : []

  const datosParticipacion = estadisticas
    ? [
        { categoria: "Estudiantes", cantidad: estadisticas.participacion.estudiantes },
        { categoria: "Docentes", cantidad: estadisticas.participacion.docentes },
        { categoria: "Administrativos", cantidad: estadisticas.participacion.administrativos },
        { categoria: "Serv. Generales", cantidad: estadisticas.participacion.serviciosGenerales },
      ]
    : []

  return (
    <div className="min-h-screen flex flex-col">
      {/* Barra superior negra decorativa */}
      <div className="bg-black h-2 w-full"></div>

      {/* Header rojo con logo */}
      <header className="bg-[#C41E3A] text-white p-4">
        <div className="container mx-auto flex items-center">
          <div className="flex items-center">
            <Image
              src="/images/logo-universidad.png"
              alt="Escuela Colombiana de Ingeniería Julio Garavito"
              width={200}
              height={80}
              className="h-16 w-auto"
            />
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="flex-1 bg-gray-50">
        <div className="container mx-auto p-6 space-y-6">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <BarChart3 className="h-8 w-8 text-[#C41E3A]" />
              <h1 className="text-3xl font-bold text-gray-800">Estadísticas de Turnos</h1>
            </div>
            <p className="text-gray-600">Sistema de análisis y reportes de bienestar universitario</p>
          </div>

          {/* Formulario de Filtros */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Filtros de Búsqueda
              </CardTitle>
              <CardDescription>Selecciona los criterios para generar las estadísticas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipo-usuario">Tipo de Usuario</Label>
                  <Select value={tipoUsuario} onValueChange={setTipoUsuario}>
                    <SelectTrigger id="tipo-usuario">
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los tipos</SelectItem>
                      {tiposUsuario.map((tipo) => (
                        <SelectItem key={tipo.value} value={tipo.value}>
                          {tipo.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fecha-inicio">Fecha Inicio</Label>
                  <Input
                    id="fecha-inicio"
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fecha-fin">Fecha Fin</Label>
                  <Input id="fecha-fin" type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
                </div>
              </div>

              <Separator />

              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={generarEstadisticas}
                  disabled={loading}
                  className="flex items-center gap-2 bg-[#C41E3A] hover:bg-[#B01E3A]"
                >
                  <BarChart3 className="h-4 w-4" />
                  {loading ? "Generando..." : "Generar Estadísticas"}
                </Button>

                <Button variant="outline" onClick={exportarExcel} className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Exportar Excel
                </Button>

                <Button variant="outline" onClick={exportarPDF} className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Exportar PDF
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Gráficos de Estadísticas */}
          {loading && (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center space-y-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C41E3A] mx-auto"></div>
                  <p className="text-muted-foreground">Generando estadísticas...</p>
                </div>
              </CardContent>
            </Card>
          )}

          {estadisticas && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Gráfico de Pastel - Asistencia */}
              <Card className="w-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Asistencia
                  </CardTitle>
                  <CardDescription>Distribución de asistencia por estado</CardDescription>
                </CardHeader>
                <CardContent className="w-full">
                  <ChartContainer
                    config={{
                      atendidos: { label: "Atendidos", color: COLORS[0] },
                      noAtendidos: { label: "No Atendidos", color: COLORS[1] },
                    }}
                    className="h-[350px] w-full"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={datosAsistencia}
                          cx="50%"
                          cy="50%"
                          outerRadius="80%"
                          innerRadius="40%"
                          dataKey="value"
                          label={({ name, percent }) => `${name}\n${(percent * 100).toFixed(1)}%`}
                          labelLine={false}
                        >
                          {datosAsistencia.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <ChartTooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload
                              const total = datosAsistencia.reduce((sum, item) => sum + item.value, 0)
                              const percentage = ((data.value / total) * 100).toFixed(1)
                              return (
                                <div className="bg-background border rounded-lg p-2 shadow-md">
                                  <p className="font-medium">{data.name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    Cantidad: {data.value} ({percentage}%)
                                  </p>
                                </div>
                              )
                            }
                            return null
                          }}
                        />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Gráfico de Barras - Participación */}
              <Card className="w-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Participación por Tipo
                  </CardTitle>
                  <CardDescription>Cantidad de participantes por categoría</CardDescription>
                </CardHeader>
                <CardContent className="w-full">
                  <ChartContainer
                    config={{
                      cantidad: { label: "Cantidad", color: COLORS[0] },
                    }}
                    className="h-[350px] w-full"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={datosParticipacion} margin={{ top: 20, right: 20, left: 20, bottom: 100 }}>
                        <XAxis
                          dataKey="categoria"
                          tick={{ fontSize: 10 }}
                          angle={-45}
                          textAnchor="end"
                          height={100}
                          interval={0}
                          width={60}
                        />
                        <YAxis tick={{ fontSize: 10 }} />
                        <ChartTooltip
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-background border rounded-lg p-2 shadow-md">
                                  <p className="font-medium">{label}</p>
                                  <p className="text-sm text-muted-foreground">Cantidad: {payload[0].value}</p>
                                </div>
                              )
                            }
                            return null
                          }}
                        />
                        <Bar
                          dataKey="cantidad"
                          fill={COLORS[0]}
                          radius={[4, 4, 0, 0]}
                          name="Participantes"
                          maxBarSize={80}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Gráfico de Líneas - Tendencias Mensuales */}
              <Card className="xl:col-span-2 w-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Tendencias Mensuales
                  </CardTitle>
                  <CardDescription>Evolución de la participación a lo largo del tiempo</CardDescription>
                </CardHeader>
                <CardContent className="w-full">
                  <ChartContainer
                    config={{
                      cantidad: { label: "Cantidad", color: COLORS[0] },
                    }}
                    className="h-[350px] w-full"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={estadisticas.tendenciasMensuales}
                        margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                      >
                        <XAxis dataKey="mes" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <ChartTooltip
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-background border rounded-lg p-2 shadow-md">
                                  <p className="font-medium">{label}</p>
                                  <p className="text-sm text-muted-foreground">Participantes: {payload[0].value}</p>
                                </div>
                              )
                            }
                            return null
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="cantidad"
                          stroke={COLORS[0]}
                          strokeWidth={3}
                          dot={{ fill: COLORS[0], strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6, stroke: COLORS[0], strokeWidth: 2 }}
                          name="Participantes"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          )}

          {!estadisticas && !loading && (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center space-y-2">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto" />
                  <p className="text-muted-foreground">
                    Selecciona los filtros y haz clic en "Generar Estadísticas" para ver los resultados
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#C41E3A] text-white py-4 mt-8">
        <div className="container mx-auto text-center">
          <p className="text-sm">Estadísticas Bienestar Universitario @2025</p>
        </div>
      </footer>
    </div>
  )
}
