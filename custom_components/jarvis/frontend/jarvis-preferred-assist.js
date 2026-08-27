/* JARVIS Assist bridge: selected pipeline + automatic fallback. */
(async () => {
  await customElements.whenDefined("jarvis-core-hud");
  const C = customElements.get("jarvis-core-hud");
  if (!C || C.prototype.__jarvisAssistFinalPatch) return;
  C.prototype.__jarvisAssistFinalPatch = true;
  const inject = (hud) => {
    const root = hud.shadowRoot, grid = root?.querySelector(".grid");
    if (!grid) return false;
    if (!root.getElementById("pipelineCard")) {
      const card=document.createElement("section"); card.className="card"; card.id="pipelineCard"; card.style.gridColumn="1/-1";
      card.innerHTML='<div class="title">🧠 ASSISTANT / PIPELINE</div><div class="row"><select id="pipelineSelect" style="flex:1;min-height:40px;border:1px solid #00cfff55;border-radius:7px;background:#031322;color:#dffaff;padding:0 10px"><option value="">AUTOMATIQUE · ASSIST</option></select></div><div id="pipelineInfo" style="font:9px monospace;color:#72ffad;margin-top:7px">Détection…</div>';
      grid.insertBefore(card,grid.lastElementChild);
    }
    if (!root.getElementById("ledBrightnessCard")) {
      const card=document.createElement("section"); card.className="card"; card.id="ledBrightnessCard";
      card.innerHTML='<div class="title">💡 RÉGLAGE LED</div><label style="font-size:9px;display:block">LUMINOSITÉ HUD <input id="ledBrightness" type="range" min="30" max="100" value="100" style="width:100%;accent-color:#00eaff"></label>';
      const controls=[...grid.querySelectorAll(".card")].find(x=>x.querySelector("#refresh"))||grid.lastElementChild; grid.insertBefore(card,controls);
    }
    const select=root.getElementById("pipelineSelect");
    if(select&&!select.dataset.bound){select.dataset.bound="1";select.value=localStorage.getItem("jarvis_assist_pipeline")||"";select.onchange=()=>{localStorage.setItem("jarvis_assist_pipeline",select.value);hud._log?.("✓ Pipeline → "+(select.value||"AUTOMATIQUE"));};hud._loadJarvisPipelines?.();}
    const bright=root.getElementById("ledBrightness");
    if(bright&&!bright.dataset.bound){bright.dataset.bound="1";bright.value=localStorage.getItem("jarvis_led_brightness")||"100";const apply=()=>{const v=Number(bright.value);localStorage.setItem("jarvis_led_brightness",String(v));hud.style.filter=`brightness(${v}%)`;};bright.oninput=apply;apply();}
    return true;
  };
  C.prototype._loadJarvisPipelines=async function(){const root=this.shadowRoot,select=root?.getElementById("pipelineSelect"),info=root?.getElementById("pipelineInfo");if(!select||!this._hass?.callWS)return;try{const result=await this._hass.callWS({type:"assist_pipeline/pipeline/list"}),pipelines=Array.isArray(result?.pipelines)?result.pipelines:[];for(const p of pipelines){if(!p?.id||[...select.options].some(o=>o.value===p.id))continue;const o=document.createElement("option");o.value=p.id;o.textContent=`${p.name||p.id} · ${p.conversation_engine||"HA"}`;select.appendChild(o);}const saved=localStorage.getItem("jarvis_assist_pipeline")||"";select.value=[...select.options].some(o=>o.value===saved)?saved:"";if(info)info.textContent=pipelines.length?`${pipelines.length} pipeline(s) Assist détecté(s)`:"Aucun pipeline Assist détecté";this._log?.("✓ Assist · "+pipelines.length+" pipeline(s)");}catch(e){if(info)info.textContent="Détection Assist indisponible";this._log?.("⚠️ Pipeline Assist · "+e.message);}};
  const originalRender=C.prototype.render; C.prototype.render=function(){originalRender.call(this);inject(this);};
  C.prototype.process=async function(text){const token=this._token();if(!token||!text)return;this.setState("JARVIS RÉFLÉCHIT","#ffb000");try{const body={text};const selected=localStorage.getItem("jarvis_assist_pipeline")||"";if(selected)body.pipeline=selected;if(this.conversationId)body.conversation_id=this.conversationId;const r=await fetch(location.origin+"/api/jarvis/conversation",{method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw Error(d?.message||d?.error||("HTTP "+r.status));this.conversationId=d.conversation_id||this.conversationId;this._log("✓ Assistant Assist → "+(d.agent_id||"HA")+" · "+(d.pipeline_name||"Automatique"));const speech=d?.response?.speech?.plain?.speech||d?.response?.speech?.ssml?.speech||"";if(speech){this._log("🤖 "+speech);if(!this.muted){this.setState("JARVIS PARLE","#b56cff");const u=new SpeechSynthesisUtterance(speech);u.lang="fr-FR";u.rate=.92;u.onend=()=>this.conversationMode?this.setState("JARVIS ÉCOUTE","#39ff88"):this.setState("OPÉRATIONNEL","#00eaff");speechSynthesis.speak(u);}}else if(this.conversationMode)this.setState("JARVIS ÉCOUTE","#39ff88");}catch(e){this._log("✗ Assistant Assist "+e.message);this.setState("JARVIS ERREUR","#ff4050");setTimeout(()=>this.conversationMode&&this.setState("JARVIS ÉCOUTE","#39ff88"),1000);}};
  const timer=setInterval(()=>document.querySelectorAll("jarvis-core-hud").forEach(inject),100);setTimeout(()=>clearInterval(timer),15000);
})();
