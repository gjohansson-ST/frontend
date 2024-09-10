import { HassEntity } from "home-assistant-js-websocket";
import {
  CSSResultGroup,
  LitElement,
  TemplateResult,
  css,
  html,
  nothing,
} from "lit";
import { format } from "date-fns";
import { customElement, property, state } from "lit/decorators";
import { computeStateName } from "../../../common/entity/compute_state_name";
import "../../../components/entity/state-badge";
import "../../../components/entity/ha-entity-toggle";
import "../../../components/ha-select";
import "../../../components/ha-time-input";
import "../../../components/ha-climate-state";
import "../../../components/ha-cover-controls";
import "../../../components/ha-cover-tilt-controls";
import { isTiltOnly } from "../../../data/cover";
import { isUnavailableState } from "../../../data/entity";
import { SENSOR_DEVICE_CLASS_TIMESTAMP } from "../../../data/sensor";
import "../../../panels/lovelace/components/hui-timestamp-display";
import { HomeAssistant } from "../../../types";

@customElement("entity-preview-row")
class EntityPreviewRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private stateObj?: HassEntity;

  protected render() {
    if (!this.stateObj) {
      return nothing;
    }
    const stateObj = this.stateObj;
    return html`<state-badge
        .hass=${this.hass}
        .stateObj=${stateObj}
        stateColor
      ></state-badge>
      <div class="name" .title=${computeStateName(stateObj)}>
        ${computeStateName(stateObj)}
      </div>
      <div class="value">${this.renderEntityState(stateObj)}</div>`;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: flex;
        align-items: center;
        flex-direction: row;
      }
      .name {
        margin-left: 16px;
        margin-right: 8px;
        margin-inline-start: 16px;
        margin-inline-end: 8px;
        flex: 1 1 30%;
      }
      .value {
        direction: ltr;
      }
      .numberflex {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        flex-grow: 2;
      }
      .numberstate {
        min-width: 45px;
        text-align: end;
      }
      ha-textfield {
        text-align: end;
        direction: ltr !important;
      }
      ha-slider {
        width: 100%;
        max-width: 200px;
      }
      ha-time-input {
        margin-left: 4px;
        margin-inline-start: 4px;
        margin-inline-end: initial;
        direction: var(--direction);
      }
      .datetimeflex {
        display: flex;
        justify-content: flex-end;
        width: 100%;
      }
      mwc-button {
        margin-right: -0.57em;
        margin-inline-end: -0.57em;
        margin-inline-start: initial;
      }
    `;
  }

  private renderEntityState(stateObj: HassEntity): TemplateResult | string {
    const domain = stateObj.entity_id.split(".", 1)[0];
    if (domain === "sensor") {
      const showSensor =
        stateObj.attributes.device_class === SENSOR_DEVICE_CLASS_TIMESTAMP &&
        !isUnavailableState(stateObj.state);
      return html`
        ${showSensor
          ? html`
              <hui-timestamp-display
                .hass=${this.hass}
                .ts=${new Date(stateObj.state)}
                capitalize
              ></hui-timestamp-display>
            `
          : this.hass.formatEntityState(stateObj)}
      `;
    }
    if (domain === "switch") {
      const showToggle =
        stateObj.state === "on" ||
        stateObj.state === "off" ||
        isUnavailableState(stateObj.state);
      return html`
        ${showToggle
          ? html`
              <ha-entity-toggle
                .hass=${this.hass}
                .stateObj=${stateObj}
              ></ha-entity-toggle>
            `
          : this.hass.formatEntityState(stateObj)}
      `;
    }
    if (domain === "number") {
      const showNumberSlider =
        stateObj.attributes.mode === "slider" ||
        (stateObj.attributes.mode === "auto" &&
          (Number(stateObj.attributes.max) - Number(stateObj.attributes.min)) /
            Number(stateObj.attributes.step) <=
            256);
      return html`
        ${showNumberSlider
          ? html`
              <div class="numberflex">
                <ha-slider
                  labeled
                  .disabled=${isUnavailableState(stateObj.state)}
                  .step=${Number(stateObj.attributes.step)}
                  .min=${Number(stateObj.attributes.min)}
                  .max=${Number(stateObj.attributes.max)}
                  .value=${Number(stateObj.state)}
                ></ha-slider>
                <span class="state">
                  ${this.hass.formatEntityState(stateObj)}
                </span>
              </div>
            `
          : html` <div class="numberflex numberstate">
              <ha-textfield
                autoValidate
                .disabled=${isUnavailableState(stateObj.state)}
                pattern="[0-9]+([\\.][0-9]+)?"
                .step=${Number(stateObj.attributes.step)}
                .min=${Number(stateObj.attributes.min)}
                .max=${Number(stateObj.attributes.max)}
                .value=${stateObj.state}
                .suffix=${stateObj.attributes.unit_of_measurement}
                type="number"
              ></ha-textfield>
            </div>`}
      `;
    }
    if (domain === "select") {
      return html`
        <ha-select
          .label=${computeStateName(stateObj)}
          .value=${stateObj.state}
          .disabled=${isUnavailableState(stateObj.state)}
          naturalMenuWidth
        >
          ${stateObj.attributes.options
            ? stateObj.attributes.options.map(
                (option) => html`
                  <mwc-list-item .value=${option}>
                    ${this.hass!.formatEntityState(stateObj, option)}
                  </mwc-list-item>
                `
              )
            : ""}
        </ha-select>
      `;
    }
    if (domain === "date") {
      return html`
        <ha-date-input
          .locale=${this.hass.locale}
          .disabled=${isUnavailableState(stateObj.state)}
          .value=${isUnavailableState(stateObj.state)
            ? undefined
            : stateObj.state}
        >
        </ha-date-input>
      `;
    }
    if (domain === "datetime") {
      const dateObj = isUnavailableState(stateObj.state)
        ? undefined
        : new Date(stateObj.state);
      const time = dateObj ? format(dateObj, "HH:mm:ss") : undefined;
      const date = dateObj ? format(dateObj, "yyyy-MM-dd") : undefined;
      return html`
        <div class="datetimeflex">
          <ha-date-input
            .label=${computeStateName(stateObj)}
            .locale=${this.hass.locale}
            .value=${date}
            .disabled=${isUnavailableState(stateObj.state)}
          >
          </ha-date-input>
          <ha-time-input
            .value=${time}
            .disabled=${isUnavailableState(stateObj.state)}
            .locale=${this.hass.locale}
          ></ha-time-input>
        </div>
      `;
    }
    if (domain === "time") {
      return html`
        <ha-time-input
          .value=${isUnavailableState(stateObj.state)
            ? undefined
            : stateObj.state}
          .locale=${this.hass.locale}
          .disabled=${isUnavailableState(stateObj.state)}
        ></ha-time-input>
      `;
    }
    if (domain === "lock") {
      return html`
        <mwc-button
          .disabled=${isUnavailableState(stateObj.state)}
          class="text-content"
        >
          ${stateObj.state === "locked"
            ? this.hass!.localize("ui.card.lock.unlock")
            : this.hass!.localize("ui.card.lock.lock")}
        </mwc-button>
      `;
    }
    if (domain === "button") {
      return html`
        <mwc-button .disabled=${isUnavailableState(stateObj.state)}>
          ${this.hass.localize("ui.card.button.press")}
        </mwc-button>
      `;
    }
    if (domain === "climate") {
      return html`
        <ha-climate-state .hass=${this.hass} .stateObj=${stateObj}>
        </ha-climate-state>
      `;
    }
    if (domain === "cover") {
      return html`
        ${isTiltOnly(stateObj)
          ? html`
              <ha-cover-tilt-controls
                .hass=${this.hass}
                .stateObj=${stateObj}
              ></ha-cover-tilt-controls>
            `
          : html`
              <ha-cover-controls
                .hass=${this.hass}
                .stateObj=${stateObj}
              ></ha-cover-controls>
            `}
      `;
    }
    if (domain === "text") {
      return html`
        <ha-textfield
          .label=${computeStateName(stateObj)}
          .disabled=${isUnavailableState(stateObj.state)}
          .value=${stateObj.state}
          .minlength=${stateObj.attributes.min}
          .maxlength=${stateObj.attributes.max}
          .autoValidate=${stateObj.attributes.pattern}
          .pattern=${stateObj.attributes.pattern}
          .type=${stateObj.attributes.mode}
          placeholder=${this.hass!.localize("ui.card.text.emtpy_value")}
        ></ha-textfield>
      `;
    }
    if (domain === "weather") {
      return html`
        <div>
          ${isUnavailableState(stateObj.state) ||
          stateObj.attributes.temperature === undefined ||
          stateObj.attributes.temperature === null
            ? this.hass.formatEntityState(stateObj)
            : this.hass.formatEntityAttributeValue(stateObj, "temperature")}
        </div>
      `;
    }
    return this.hass.formatEntityState(stateObj);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "entity-preview-row": EntityPreviewRow;
  }
}
