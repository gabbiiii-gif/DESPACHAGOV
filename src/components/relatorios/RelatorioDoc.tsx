import { forwardRef, type CSSProperties } from "react";
import { fmtHoras, type DadosRelatorio } from "@/lib/relatorioModelo";
import semedLogo from "@/assets/semed.png";

// Documento de relatório na identidade visual institucional do DespachaGov
// (verde-oliva + laranja). Renderizado em 820px para virar PDF/PNG fiel.
// Estilos inline de propósito: garante cores/fontes na captura (html2canvas).

const C = {
  oliva: "#636B2F",
  olivaClaro: "#7A8340",
  laranja: "#C2602F",
  laranjaEsc: "#8A3D18",
  verde: "#157A52",
  cinza: "#6B7488",
  cinzaClaro: "#9099ab",
  borda: "#E3E6EC",
  linha: "#EEF0F4",
};
const display = "'Plus Jakarta Sans','Public Sans',sans-serif";
const corpo = "'Public Sans',sans-serif";

function Kpi({ valor, rotulo, cor }: { valor: string; rotulo: string; cor?: string }) {
  return (
    <div style={{ border: `1px solid ${C.borda}`, borderRadius: 10, padding: 16 }}>
      <div style={{ fontFamily: display, fontSize: 27, fontWeight: 800, color: cor ?? C.oliva }}>{valor}</div>
      <div style={{ fontSize: 11.5, color: C.cinza, fontWeight: 600, marginTop: 2 }}>{rotulo}</div>
    </div>
  );
}

const tituloSecao: CSSProperties = {
  fontSize: 12, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: C.cinza, marginBottom: 14,
};
const th: CSSProperties = {
  textAlign: "left", padding: "9px 8px", fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em", color: C.cinza,
};
const td: CSSProperties = { padding: "9px 8px" };

export interface RelatorioDocProps {
  tipo: "mensal" | "unidade" | "personalizado" | "empresa" | "sla" | "comparativo";
  titulo: string;
  subtitulo: string;
  periodoRotulo: string;
  periodoValor: string;
  docNum: string;
  emitidoEm: string;
  filtrosLinha?: string;
  unidadeInfo?: string;
  secretariaNome: string;
  dados: DadosRelatorio;
}

export const RelatorioDoc = forwardRef<HTMLDivElement, RelatorioDocProps>(function RelatorioDoc(props, ref) {
  const { tipo, titulo, subtitulo, periodoRotulo, periodoValor, docNum, emitidoEm, filtrosLinha, unidadeInfo, secretariaNome, dados } = props;
  const maxDia = Math.max(1, ...dados.porDia.map((d) => d.total));
  const listaMostrada = dados.chamados.slice(0, 12);

  return (
    <div
      ref={ref}
      style={{
        width: 820, background: "#fff", padding: "52px 52px 44px", color: C.oliva,
        fontFamily: corpo, boxSizing: "border-box",
      }}
    >
      {/* logo institucional */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
        <img src={semedLogo} alt="SEMED · Prefeitura de Altamira" style={{ height: 62, display: "block" }} />
      </div>

      {/* header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderBottom: `3px solid ${C.oliva}`, paddingBottom: 18, marginBottom: 6 }}>
        <div>
          <div style={{ fontFamily: display, fontWeight: 800, fontSize: 15, color: C.oliva }}>Prefeitura de Altamira</div>
          <div style={{ fontSize: 12.5, color: C.cinza }}>Secretaria Municipal de Educação</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: C.laranja, fontWeight: 700 }}>{periodoRotulo}</div>
          <div style={{ fontFamily: display, fontSize: 18, fontWeight: 800, color: C.oliva }}>{periodoValor}</div>
        </div>
      </div>
      <div style={{ textAlign: "right", fontSize: 11, color: C.cinzaClaro, marginBottom: 26 }}>
        Emitido em {emitidoEm} · Doc. nº {docNum}
      </div>

      <h1 style={{ fontFamily: display, fontSize: 25, fontWeight: 800, color: C.oliva, margin: "0 0 6px" }}>{titulo}</h1>
      <p style={{ fontSize: 14, color: C.cinza, lineHeight: 1.6, margin: "0 0 26px" }}>{subtitulo}</p>

      {/* unidade card */}
      {tipo === "unidade" && unidadeInfo && (
        <div style={{ display: "flex", gap: 16, alignItems: "center", background: "#F7F8FB", border: `1px solid ${C.borda}`, borderRadius: 12, padding: "18px 20px", marginBottom: 26 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: display, fontSize: 17, fontWeight: 800, color: C.oliva }}>{periodoValor}</div>
            <div style={{ fontSize: 12.5, color: C.cinza }}>{unidadeInfo}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: display, fontSize: 26, fontWeight: 800, color: C.oliva }}>{dados.total}</div>
            <div style={{ fontSize: 11, color: C.cinza }}>chamados no período</div>
          </div>
        </div>
      )}

      {filtrosLinha && <div style={{ textAlign: "right", fontSize: 11, color: C.cinzaClaro, marginBottom: 20 }}>{filtrosLinha}</div>}

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 13, marginBottom: 30 }}>
        <Kpi valor={String(dados.total)} rotulo="chamados totais" />
        <Kpi valor={String(dados.concluidos)} rotulo="concluídos" cor={C.verde} />
        <Kpi valor={String(dados.emAberto)} rotulo="em aberto" cor={C.laranja} />
        <Kpi valor={`${dados.taxaPct}%`} rotulo="taxa de conclusão" cor={C.verde} />
      </div>
      <div style={{ fontSize: 12, color: C.cinza, marginBottom: 28 }}>
        Tempo médio até a conclusão: <strong style={{ color: C.oliva }}>{fmtHoras(dados.tempoMedioHoras)}</strong>
      </div>


      {/* volume diário (personalizado) */}
      {tipo === "personalizado" && dados.porDia.length > 0 && (
        <>
          <div style={tituloSecao}>Volume diário</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 120, marginBottom: 30 }}>
            {dados.porDia.slice(0, 16).map((d) => (
              <div key={d.dia} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, height: "100%", justifyContent: "flex-end" }}>
                <div style={{ width: "100%", maxWidth: 40, height: `${Math.round((d.total / maxDia) * 100)}%`, background: `linear-gradient(180deg,#2456A6,${C.oliva})`, borderRadius: "5px 5px 0 0" }} />
                <span style={{ fontSize: 10, color: C.cinza }}>{d.dia}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Por empresa: tabela com desempenho de cada empresa executora. */}
      {tipo === "empresa" && (
        <>
          <div style={tituloSecao}>Desempenho por empresa</div>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 30 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${C.oliva}` }}>
                <th style={th}>Empresa</th>
                <th style={{ ...th, textAlign: "right" }}>Chamados</th>
                <th style={{ ...th, textAlign: "right" }}>Concluídos</th>
                <th style={{ ...th, textAlign: "right" }}>Em aberto</th>
                <th style={{ ...th, textAlign: "right" }}>Taxa</th>
                <th style={{ ...th, textAlign: "right" }}>Tempo médio</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: 13, color: C.oliva }}>
              {dados.porEmpresa.map((l) => (
                <tr key={l.empresaId} style={{ borderBottom: `1px solid ${C.linha}` }}>
                  <td style={{ ...td, fontWeight: 600 }}>{l.nome}</td>
                  <td style={{ ...td, textAlign: "right" }}>{l.total}</td>
                  <td style={{ ...td, textAlign: "right" }}>{l.concluidos}</td>
                  <td style={{ ...td, textAlign: "right", color: C.laranja }}>{l.emAberto}</td>
                  <td style={{ ...td, textAlign: "right", color: C.verde, fontWeight: 700 }}>{l.taxaPct}%</td>
                  <td style={{ ...td, textAlign: "right", color: C.cinza }}>{fmtHoras(l.tempoMedioHoras)}</td>
                </tr>
              ))}
              {dados.porEmpresa.length === 0 && (
                <tr><td style={{ ...td, color: C.cinzaClaro }} colSpan={6}>Nenhuma empresa com chamados no período.</td></tr>
              )}
            </tbody>
          </table>
        </>
      )}

      {/* SLA por urgência: cumprimento do prazo por nível. */}
      {tipo === "sla" && (
        <>
          <div style={tituloSecao}>Cumprimento de SLA por urgência</div>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 30 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${C.oliva}` }}>
                <th style={th}>Urgência</th>
                <th style={{ ...th, textAlign: "right" }}>SLA</th>
                <th style={{ ...th, textAlign: "right" }}>Total</th>
                <th style={{ ...th, textAlign: "right" }}>Concluídos</th>
                <th style={{ ...th, textAlign: "right" }}>Dentro</th>
                <th style={{ ...th, textAlign: "right" }}>Fora</th>
                <th style={{ ...th, textAlign: "right" }}>% dentro</th>
                <th style={{ ...th, textAlign: "right" }}>Tempo médio</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: 12.5, color: C.oliva }}>
              {dados.porSla.map((l) => (
                <tr key={l.urgencia} style={{ borderBottom: `1px solid ${C.linha}` }}>
                  <td style={{ ...td, fontWeight: 600 }}>{l.urgencia}</td>
                  <td style={{ ...td, textAlign: "right", color: C.cinza }}>{l.slaHoras}h</td>
                  <td style={{ ...td, textAlign: "right" }}>{l.total}</td>
                  <td style={{ ...td, textAlign: "right" }}>{l.concluidos}</td>
                  <td style={{ ...td, textAlign: "right", color: C.verde }}>{l.dentroSla}</td>
                  <td style={{ ...td, textAlign: "right", color: C.laranjaEsc }}>{l.foraSla}</td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 700, color: l.pctDentro >= 80 ? C.verde : l.pctDentro >= 50 ? C.laranja : C.laranjaEsc }}>{l.pctDentro}%</td>
                  <td style={{ ...td, textAlign: "right", color: C.cinza }}>{fmtHoras(l.tempoMedioHoras)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Comparativo mensal: barras de volume e taxa de conclusão. */}
      {tipo === "comparativo" && dados.porMes.length > 0 && (
        <>
          <div style={tituloSecao}>Evolução mensal (últimos {dados.porMes.length} meses)</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 160, marginBottom: 22 }}>
            {(() => {
              const maxMes = Math.max(1, ...dados.porMes.map((m) => m.total));
              return dados.porMes.map((m) => (
                <div key={m.mes} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, height: "100%", justifyContent: "flex-end" }}>
                  <div style={{ fontSize: 10, color: C.cinza, fontWeight: 700 }}>{m.total}</div>
                  <div style={{ width: "100%", maxWidth: 46, height: `${Math.round((m.total / maxMes) * 100)}%`, background: `linear-gradient(180deg,${C.laranja},${C.oliva})`, borderRadius: "5px 5px 0 0" }} />
                  <span style={{ fontSize: 10, color: C.cinza }}>{m.rotulo}</span>
                </div>
              ));
            })()}
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 30 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${C.oliva}` }}>
                <th style={th}>Mês</th>
                <th style={{ ...th, textAlign: "right" }}>Chamados</th>
                <th style={{ ...th, textAlign: "right" }}>Concluídos</th>
                <th style={{ ...th, textAlign: "right" }}>Taxa</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: 13, color: C.oliva }}>
              {dados.porMes.map((m) => (
                <tr key={m.mes} style={{ borderBottom: `1px solid ${C.linha}` }}>
                  <td style={{ ...td, fontWeight: 600 }}>{m.rotulo}</td>
                  <td style={{ ...td, textAlign: "right" }}>{m.total}</td>
                  <td style={{ ...td, textAlign: "right" }}>{m.concluidos}</td>
                  <td style={{ ...td, textAlign: "right", color: C.verde, fontWeight: 700 }}>{m.taxaPct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* detalhamento por chamado, agrupado por escola (mensal) */}
      {tipo === "mensal" && (
        <>
          <div style={tituloSecao}>Detalhamento por chamado</div>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 30 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${C.oliva}` }}>
                <th style={th}>Escola</th>
                <th style={{ ...th, textAlign: "right" }}>Em andamento</th>
                <th style={{ ...th, textAlign: "right" }}>Concluídos</th>
                <th style={{ ...th, textAlign: "right" }}>%</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: 13, color: C.oliva }}>
              {dados.porEscola.map((l) => (
                <tr key={l.unidadeId} style={{ borderBottom: `1px solid ${C.linha}` }}>
                  <td style={{ ...td, fontWeight: 600 }}>{l.nome}</td>
                  <td style={{ ...td, textAlign: "right", color: C.laranja }}>{l.emAndamento}</td>
                  <td style={{ ...td, textAlign: "right" }}>{l.concluidos}</td>
                  <td style={{ ...td, textAlign: "right", color: C.verde, fontWeight: 700 }}>{l.pct}%</td>
                </tr>
              ))}
              {dados.porEscola.length === 0 && (
                <tr><td style={{ ...td, color: C.cinzaClaro }} colSpan={4}>Nenhum chamado no período.</td></tr>
              )}
              <tr style={{ borderBottom: `2px solid ${C.oliva}`, fontWeight: 800 }}>
                <td style={{ ...td, padding: "11px 8px" }}>Total</td>
                <td style={{ ...td, textAlign: "right", padding: "11px 8px", color: C.laranja }}>{dados.emAberto}</td>
                <td style={{ ...td, textAlign: "right", padding: "11px 8px" }}>{dados.concluidos}</td>
                <td style={{ ...td, textAlign: "right", padding: "11px 8px", color: C.verde }}>{dados.taxaPct}%</td>
              </tr>
            </tbody>
          </table>
        </>
      )}

      {/* lista de chamados (unidade / personalizado) */}
      {(tipo === "unidade" || tipo === "personalizado") && (
        <>
          <div style={tituloSecao}>Chamados do período</div>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 14 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${C.oliva}` }}>
                <th style={th}>Data</th>
                <th style={th}>Serviço</th>
                {tipo === "personalizado" && <th style={th}>Unidade</th>}
                <th style={{ ...th, textAlign: "right" }}>Status</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: 12.5, color: C.oliva }}>
              {listaMostrada.map((c, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${C.linha}` }}>
                  <td style={{ ...td, color: C.cinza }}>{c.data}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{c.descricao}</td>
                  {tipo === "personalizado" && <td style={td}>{c.unidade}</td>}
                  <td style={{ ...td, textAlign: "right" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: c.status === "Concluído" ? C.verde : C.laranjaEsc, background: c.status === "Concluído" ? "rgba(31,157,107,.13)" : "rgba(194,96,47,.13)", padding: "3px 9px", borderRadius: 999 }}>{c.status}</span>
                  </td>
                </tr>
              ))}
              {listaMostrada.length === 0 && (
                <tr><td style={{ ...td, color: C.cinzaClaro }} colSpan={4}>Nenhum chamado no período.</td></tr>
              )}
            </tbody>
          </table>
          <div style={{ fontSize: 11.5, color: C.cinzaClaro, marginBottom: 36 }}>
            Exibindo {listaMostrada.length} de {dados.chamados.length} chamados.
          </div>
        </>
      )}

      {/* assinatura */}
      <div style={{ display: "flex", justifyContent: "center", marginTop: 50 }}>
        <div style={{ textAlign: "center", width: 320 }}>
          <div style={{ borderTop: `1.5px solid ${C.oliva}`, paddingTop: 8, fontSize: 12.5, color: C.oliva, fontWeight: 700 }}>{secretariaNome}</div>
          <div style={{ fontSize: 11.5, color: C.cinza }}>Secretaria de Educação</div>
        </div>
      </div>
      <div style={{ marginTop: 36, paddingTop: 14, borderTop: `1px solid ${C.borda}`, display: "flex", justifyContent: "space-between", fontSize: 10.5, color: C.cinzaClaro }}>
        <span>DespachaGov · Relatório gerado automaticamente</span>
        <span>Página 1 de 1</span>
      </div>
    </div>
  );
});
