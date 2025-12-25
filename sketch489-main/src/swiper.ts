import { Bodies, Body, Composite, Engine, Events, Render, Runner } from 'matter-js';
import { Conf } from '../core/conf';
import { Func } from '../core/func';
import { MouseMgr } from '../core/mouseMgr';
import { MyDisplay } from '../core/myDisplay';
import { Tween } from '../core/tween';
import { DisplayConstructor } from '../libs/display';
import { Point } from '../libs/point';
import { Util } from '../libs/util';
import { Rect } from '../libs/rect';

export class Swiper extends MyDisplay {
  private _tg: HTMLElement;
  private _isTouch: boolean = false;
  private _pA: Point = new Point();
  private _pB: Point = new Point();
  private _move: number = 0;
  private _startPos: Point = new Point();
  private _nowPos: Point = new Point();
  private _follow: Point = new Point();
  private _min: Point = new Point();
  private _max: Point = new Point();
  private _items: Array<SwiperItem> = [];
  private _boxScale: number = 0.8;
  private _indicator: HTMLElement;
  private _indicatorItems: Array<HTMLElement> = [];

  private _engine: Engine;
  private _render: Render;
  private _fixItemsTop: Array<Body> = [];
  // private _fixItemsBtm: Array<Body> = [];
  private _downItems: Array<Body> = [];
  private _downElItems: Array<HTMLElement> = [];
  private _downItemSize: Array<Rect> = [];

  constructor(opt: DisplayConstructor) {
    super(opt);

    this._indicator = document.querySelector('.l-indicator') as HTMLElement;

    this._tg = this.qs('.js-swiper-tg');
    this.useGPU(this._tg)

    MouseMgr.instance.usePreventDefault = true;

    // アイテム複製
    const org = document.querySelector('.js-copy') as HTMLElement;
    for(let i = 0; i < Conf.ITEM_NUM; i++) {
      const el = org.cloneNode(true) as HTMLElement;
      el.classList.remove('js-copy');
      this._tg.appendChild(el);

      Tween.set(el.querySelector('.frame'), {
        scale: this._boxScale,
      })
    }

    this.qsAll('.js-swiper-item').forEach((el,i) => {
      this._items.push(
        new SwiperItem({
          el: el,
          dispId: i,
        }),
      );

      const indi = document.createElement('div');
      this._indicator.appendChild(indi);
      this._indicatorItems.push(indi);
    });

    if (Conf.IS_TOUCH_DEVICE) {
      this._tg.addEventListener('touchstart', () => {
        this._eTouchStart();
      });
      MouseMgr.instance.onTouchEnd.push(() => {
        this._eTouchEnd();
      });
    } else {
      this._tg.addEventListener('mousedown', () => {
        this._eTouchStart();
      });
      MouseMgr.instance.onMouseUp.push(() => {
        this._eTouchEnd();
      });
    }

    // matter.jsセットアップ

    // エンジン
    this._engine = Engine.create();
    this._engine.gravity.y = 0.35 * 0.8;

    // レンダラー
    this._render = Render.create({
      element: document.body,
      engine: this._engine,
      options: {
        width: Func.sw(),
        height: Func.sh(),
        showAngleIndicator: true,
        showCollisions: true,
        showVelocity: true,
        pixelRatio:Conf.FLG_SHOW_MATTERJS ? 1 : 0.1,
      }
    });
    this._render.canvas.classList.add('js-matter')
    if(!Conf.FLG_SHOW_MATTERJS) {
      this._render.canvas.classList.add('-hide')
    }

    // カルーセルアイテム反映用Body
    const kake = this._boxScale;
    const itemSize = this._items[0].el.offsetWidth;
    // const h = 10
    this._items.forEach((_item, i) => {
      let bTop
      if(i % 3 != 0) {
        //bTop = Bodies.rectangle(itemSize * i, 0, itemSize * kake, itemSize * kake, {isStatic:true, render:{visible: Conf.FLG_SHOW_MATTERJS}});
        // this._fixItemsTop.push(bTop);

        bTop = Bodies.polygon(itemSize * i, 0, Util.randomArr([3,4]), itemSize * kake * 0.5, {isStatic:true, render:{visible: Conf.FLG_SHOW_MATTERJS}});
        this._fixItemsTop.push(bTop);

        // Body.setAngle(bTop, Util.radian(Util.range(180)));

      } else {
        bTop = Bodies.circle(itemSize * i, 0, itemSize * kake * 0.5, {isStatic:true, render:{visible: Conf.FLG_SHOW_MATTERJS}});
        this._fixItemsTop.push(bTop);
      }
      
      Composite.add(this._engine.world, [bTop]);

      // const bBtm = Bodies.rectangle(itemSize * i, 0, itemSize * kake, h, {isStatic:true, render:{visible: Conf.FLG_SHOW_MATTERJS}});
      // this._fixItemsBtm.push(bBtm);
      // Composite.add(this._engine.world, [bTop, bBtm]);
    })

    // 雨のように落ちるアイテム
    const downArea = document.querySelector('.l-downArea') as HTMLElement;
    const num = 600
    for (let i = 0; i < num; i++) {
      const dw = 10;
      const dh = 10;
      const downItem = Bodies.rectangle(Util.random(0, Func.sw()), Util.random(-Func.sh() * 0.1, -Func.sh() * 0.5), dw, dh, {
        isStatic: false,
        // density: Util.random(0.1, 10),
        angle: Util.range(1),
        mass: Util.random(0.1, 1),
        render:{visible: Conf.FLG_SHOW_MATTERJS}
      });
      this._downItems.push(downItem);
      Composite.add(this._engine.world, [downItem]);

      const downEl = document.createElement('div');
      downEl.classList.add('js-downItem');
      downArea.appendChild(downEl);
      this._downElItems.push(downEl);
      Tween.set(downEl, {
        y: -100,
        width: dw,
        height: 1,
        scale: 1.1,
        // backgroundColor: new Color(0x000000).getStyle(),
      })
      this.useGPU(downEl)

      this._downItemSize.push(new Rect(0, 0, dw, dh));
    }

    Render.run(this._render);
    const runner:Runner = Runner.create();
    Runner.run(runner, this._engine);
    Events.on(this._render, 'afterRender', () => {
      this._eAfterRender();
    })
  }

  private _eAfterRender(): void {
    // 中心に近いitemを探す
    const testX = Func.sw() * 0.5;
    let m = 9999;
    let id = 0;

    // 物理演算結果をパーツに反映
    const sh = Func.sh();
    const itemWidth = this._items[0].el.offsetWidth;
    this._fixItemsTop.forEach((val,i) => {
      const x = itemWidth * i + this._nowPos.x + itemWidth * 0.5
      Body.setPosition(val, {
        x: x, 
        y: sh * 0.5 - itemWidth * 0
      });

      const test = x - testX;
      if (Math.abs(test) < m) {
        m = Math.abs(test);
        id = i;
      }

      // const btm = this._fixItemsBtm[i];
      // Body.setPosition(btm, {
      //   x: itemWidth * i + this._nowPos.x + itemWidth * 0.5, 
      //   y: sh * 0.5 + itemWidth * 0.5 * this._boxScale + 10,
      // });
    })

    this._indicatorItems.forEach((el, i) => {
      if (i == id) {
        el.classList.add('-current');
      } else {
        el.classList.remove('-current');
      }
    })

    this._downItems.forEach((val,i) => {
      if(val.position.y > sh) {
        this._resetDownItem(val);
      }

      const downEl = this._downElItems[i];
      Tween.set(downEl, {
        x: val.position.x - this._downItemSize[i].width * 0.5,
        y: val.position.y - this._downItemSize[i].height * 0.5,
        rotationZ: Util.degree(val.angle),
      })
    })
  }

  private _resetDownItem(item: Body): void {
    Body.setPosition(item, {
      x: Util.random(0, Func.sw()), 
      y: Util.random(-Func.sh() * 0.1, -Func.sh() * 0.5),
    });
  }

  private _eTouchStart(): void {
    this._move = 0;
    this._isTouch = true;

    this._pA.set(MouseMgr.instance.x, MouseMgr.instance.y);

    this._startPos.x = this._nowPos.x;

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grab';
  }

  private _eTouchEnd(): void {
    if (!this._isTouch) return;
    this._isTouch = false;

    this._startPos.x = this._nowPos.x;

    // ドラッグ後のフォロー値
    this._follow.x = MouseMgr.instance.d.x * -2;

    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  }

  // 更新
  protected _update(): void {
    super._update();

    const marginX = 0
    const itemWidth = this._items[0].el.offsetWidth;
    this._min.x = this._items[this._items.length - 1].el.offsetLeft * -1 - itemWidth + Func.sw() - marginX;
    this._max.x = marginX;

    if (this._isTouch) {
      this._pB.set(MouseMgr.instance.x, MouseMgr.instance.y);
      if (Conf.IS_TOUCH_DEVICE) {
        this._pA = MouseMgr.instance.tStartVal[0];
      }
      this._move = (this._pA.x - this._pB.x) * -1;
      let tgX = this._startPos.x + this._move;
      
      if (tgX > this._max.x) tgX = this._max.x + (tgX - this._max.x) * 0.5;
      if (tgX < this._min.x) tgX = this._min.x + (tgX - this._min.x) * 0.5;
      this._nowPos.x = tgX;
    } else {
      this._follow.x += (0 - this._follow.x) * 0.1;
      this._startPos.x += this._follow.x;
      const tgX = this._startPos.x + this._follow.x;

      const be = 0.2;
      if (tgX > this._max.x) {
        this._nowPos.x += (this._max.x - this._nowPos.x) * be;
      } else if (tgX < this._min.x) {
        this._nowPos.x += (this._min.x - this._nowPos.x) * be;
      } else {
        this._nowPos.x = Util.clamp(tgX, this._min.x, this._max.x);
      }
    }

    Tween.set(this._tg, {
      x: this._nowPos.x,
    });
  }
}

export class SwiperItem extends MyDisplay {

  constructor(opt: DisplayConstructor) {
    super(opt);

    const frame = this.qs('.frame');
    frame.innerHTML = '' + Util.numStr((opt.dispId as number) + 1, 3)
  }

  // 更新
  protected _update(): void {
    super._update();
  }
}
