/**
 * 海域态势感知面板：内容区嵌套 iframe https://db.mk-mda.com/screen
 */
import { Panel } from './Panel';
import { t } from '@/services/i18n';

const IFRAME_URL = 'https://db.mk-mda.com/screen';

export class MaritimeSituationPanel extends Panel {
  constructor() {
    super({
      id: 'maritime-situation',
      title: t('panels.maritimeSituation'),
      showCount: false,
      className: 'panel-maritime-situation',
    });
    this.renderIframe();
  }

  private renderIframe(): void {
    const wrap = document.createElement('div');
    wrap.className = 'maritime-situation-iframe-wrap';
    wrap.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;min-height:320px;';
    const iframe = document.createElement('iframe');
    iframe.src = IFRAME_URL;
    iframe.title = t('panels.maritimeSituation');
    iframe.setAttribute('loading', 'lazy');
    iframe.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;display:block;';
    wrap.appendChild(iframe);
    this.content.innerHTML = '';
    this.content.appendChild(wrap);
    this.content.style.position = 'relative';
  }
}
