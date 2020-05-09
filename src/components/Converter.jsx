/**
 *
 * @flow
 */

import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';
import fileDownload from 'js-file-download';
import RgbQuant from 'rgbquant';

import printGIMPPalette from '../core/exportGPL';
import type { State } from '../reducers';

const titleStyle = {
  color: '#4f545c',
  marginLeft: 0,
  marginRight: 10,
  overflow: 'hidden',
  wordWrap: 'break-word',
  lineHeight: '24px',
  fontSize: 16,
  fontWeight: 500,
  marginTop: 4,
  marginBottom: 0,
};

const textStyle = {
  color: 'hsla(218, 5%, 47%, .6)',
  fontSize: 14,
  fontWeight: 500,
  position: 'relative',
  textAlign: 'inherit',
  float: 'none',
  lineHeight: 'normal',
};

function downloadOutput() {
  const output = document.getElementById('imgoutput');
  output.toBlob((blob) => fileDownload(blob, 'ppfunconvert.png'));
}

function readFile(
  file,
  selectFile,
  selectScaleWidth,
  selectScaleHeight,
) {
  if (!file) {
    return;
  }
  const fr = new FileReader();
  fr.onload = () => {
    const img = new Image();
    img.onload = () => {
      selectScaleWidth(img.width);
      selectScaleHeight(img.height);
      selectFile(img);
    };
    img.src = fr.result;
  };
  fr.readAsDataURL(file);
}

function drawPixels(idxi8, width, height) {
  const can = document.createElement('canvas');
  can.width = width;
  can.height = height;
  const ctx = can.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.mozImageSmoothingEnabled = false;
  ctx.webkitImageSmoothingEnabled = false;
  ctx.msImageSmoothingEnabled = false;

  const imgd = ctx.createImageData(can.width, can.height);
  const { data } = imgd;
  for (let i = 0, len = data.length; i < len; ++i) data[i] = idxi8[i];

  ctx.putImageData(imgd, 0, 0);
  return can;
}

function addGrid(img, lightGrid, offsetX, offsetY) {
  const can = document.createElement('canvas');
  const ctx = can.getContext('2d');
  can.width = img.width * 5;
  can.height = img.height * 5;
  ctx.imageSmoothingEnabled = false;
  ctx.mozImageSmoothingEnabled = false;
  ctx.webkitImageSmoothingEnabled = false;
  ctx.msImageSmoothingEnabled = false;
  ctx.save();
  ctx.scale(5.0, 5.0);
  ctx.drawImage(img, 0, 0);
  ctx.restore();
  ctx.fillStyle = (lightGrid) ? '#DDDDDD' : '#222222';
  for (let i = 0; i <= img.width; i += 1) {
    const thick = ((i + (offsetX * 1)) % 10 === 0) ? 2 : 1;
    ctx.fillRect(i * 5, 0, thick, can.height);
  }
  for (let j = 0; j <= img.height; j += 1) {
    const thick = ((j + (offsetY * 1)) % 10 === 0) ? 2 : 1;
    ctx.fillRect(0, j * 5, can.width, thick);
  }
  return can;
}

function scaleImage(img, width, height, doAA) {
  const can = document.createElement('canvas');
  const ctx = can.getContext('2d');
  can.width = width;
  can.height = height;
  if (doAA) {
    ctx.imageSmoothingEnabled = true;
    ctx.mozImageSmoothingEnabled = true;
    ctx.webkitImageSmoothingEnabled = true;
    ctx.msImageSmoothingEnabled = true;
  } else {
    ctx.imageSmoothingEnabled = false;
    ctx.mozImageSmoothingEnabled = false;
    ctx.webkitImageSmoothingEnabled = false;
    ctx.msImageSmoothingEnabled = false;
  }
  ctx.save();
  ctx.scale(width / img.width, height / img.height);
  ctx.drawImage(img, 0, 0);
  ctx.restore();
  return can;
}

function renderOutputImage(
  colors,
  selectedFile,
  selectedStrategy,
  selectedSerp,
  selectedColorDist,
  selectedDithDelta,
  selectedAddGrid,
  selectedLightGrid,
  selectedGridOffsetX,
  selectedGridOffsetY,
  selectedDoScaling,
  selectedScaleWidth,
  selectedScaleHeight,
  selectedScaleAA,
) {
  if (!selectedFile) {
    return;
  }
  let image = selectedFile;
  if (selectedDoScaling) {
    image = scaleImage(
      image,
      selectedScaleWidth,
      selectedScaleHeight,
      selectedScaleAA,
    );
  }
  const rgbQuant = new RgbQuant({
    colors: colors.length,
    dithKern: selectedStrategy,
    dithDelta: selectedDithDelta / 100,
    dithSerp: selectedSerp,
    palette: colors,
    reIndex: false,
    useCache: false,
    colorDist: selectedColorDist,
  });
  rgbQuant.sample(image);
  rgbQuant.palette();
  const pxls = rgbQuant.reduce(image);
  image = drawPixels(pxls, image.width, image.height);
  const output = document.getElementById('imgoutput');
  if (selectedAddGrid) {
    image = addGrid(
      image,
      selectedLightGrid,
      selectedGridOffsetX,
      selectedGridOffsetY,
    );
  }
  output.width = image.width;
  output.height = image.height;
  const ctx = output.getContext('2d');
  ctx.drawImage(image, 0, 0);
}


function Converter({
  canvasId,
  canvases,
}) {
  const [selectedCanvas, selectCanvas] = useState(canvasId);
  const [selectedFile, selectFile] = useState(null);
  const [selectedStrategy, selectStrategy] = useState('');
  const [selectedSerp, selectSerp] = useState(false);
  const [selectedColorDist, selectColorDist] = useState('euclidean');
  const [selectedDithDelta, selectDithDelta] = useState(0);
  const [selectedAddGrid, selectAddGrid] = useState(true);
  const [selectedLightGrid, selectLightGrid] = useState(false);
  const [selectedGridOffsetX, selectGridOffsetX] = useState(0);
  const [selectedGridOffsetY, selectGridOffsetY] = useState(0);
  const [selectedDoScaling, selectDoScaling] = useState(false);
  const [selectedScaleWidth, selectScaleWidth] = useState(0);
  const [selectedScaleHeight, selectScaleHeight] = useState(0);
  const [selectedScaleKeepRatio, selectScaleKeepRatio] = useState(true);
  const [selectedScaleAA, selectScaleAA] = useState(false);
  const input = document.createElement('canvas');

  useEffect(() => {
    if (selectedFile) {
      const canvas = canvases[selectedCanvas];
      renderOutputImage(
        canvas.colors.slice(canvas.cli),
        selectedFile,
        selectedStrategy,
        selectedSerp,
        selectedColorDist,
        selectedDithDelta,
        selectedAddGrid,
        selectedLightGrid,
        selectedGridOffsetX,
        selectedGridOffsetY,
        selectedDoScaling,
        selectedScaleWidth,
        selectedScaleHeight,
        selectedScaleAA,
      );
    } else {
      const output = document.getElementById('imgoutput');
      const ctx = output.getContext('2d');
      output.width = 128;
      output.height = 100;
      ctx.fillStyle = '#C4C4C4';
      ctx.fillRect(0, 0, 128, 100);
    }
  });

  return (
    <p style={{ textAlign: 'center' }}>
      <p style={textStyle}>Choose Canvas:&nbsp;
        <select
          onChange={(e) => {
            const sel = e.target;
            selectCanvas(sel.options[sel.selectedIndex].value);
          }}
        >
          {
          Object.keys(canvases).map((canvas) => ((canvases[canvas].v)
            ? null
            : (
              <option
                selected={canvas === selectedCanvas}
                value={canvas}
              >
                {
              canvases[canvas].title
            }
              </option>
            )))
        }
        </select>
      </p>
      <h3 style={titleStyle}>Palette Download</h3>
      <p style={textStyle}>
        Palette for <a href="https://www.gimp.org">GIMP</a>:&nbsp;
        <button
          type="button"
          style={{ display: 'inline' }}
          onClick={() => {
            const canvas = canvases[selectedCanvas];
            const {
              title, desc, colors, cli,
            } = canvas;
            fileDownload(
              printGIMPPalette(title, desc, colors.slice(cli)),
              `Pixelplanet${title}.gpl`,
            );
          }}
        >
          Download
        </button>
        <p>Credit for the Palette of the Moon goes to
          <a href="https://twitter.com/starhousedev">starhouse</a>.</p>
      </p>
      <h3 style={titleStyle}>Image Converter</h3>
      <p style={textStyle}>Convert an image to canvas colors</p>
      <input
        type="file"
        id="imgfile"
        onChange={(evt) => {
          const fileSel = evt.target;
          const file = (!fileSel.files || !fileSel.files[0])
            ? null : fileSel.files[0];
          readFile(file, selectFile, selectScaleWidth, selectScaleHeight);
        }}
      />
      <p style={textStyle}>Choose Strategy:&nbsp;
        <select
          onChange={(e) => {
            const sel = e.target;
            selectStrategy(sel.options[sel.selectedIndex].value);
          }}
        >
          <option
            value=""
            selected={(selectedStrategy === '')}
          >Default</option>
          {
            ['FloydSteinberg',
              'Stucki',
              'Atkinson',
              'Jarvis',
              'Burkes',
              'Sierra',
              'TwoSierra',
              'SierraLite',
              'FalseFloydSteinberg'].map((strat) => (
                <option
                  value={strat}
                  selected={(selectedStrategy === strat)}
                >{strat}</option>
            ))
          }
        </select>
      </p>
      <span style={{ ...textStyle, fontHeight: 16 }}>
        <input
          type="checkbox"
          onChange={(e) => {
            selectSerp(e.target.checked);
          }}
        />
        Serpentine Pattern Dithering
      </span>&nbsp;
      <span style={{ ...textStyle, fontHeight: 16 }}>
        <input
          type="checkbox"
          onClick={(e) => {
            const colorDist = (e.target.checked)
              ? 'euclidean' : 'manhatten';
            selectColorDist(colorDist);
          }}
        />
        Manhatten Color Distance
      </span>
      <p style={textStyle}>Dithering Delta:&nbsp;
        <input
          type="number"
          step="1"
          min="0"
          max="100"
          style={{ width: '3em' }}
          value={selectedDithDelta}
          onChange={(e) => {
            selectDithDelta(e.target.value);
          }}
        />%
      </p>
      <p style={{ ...textStyle, fontHeight: 16 }}>
        <input
          type="checkbox"
          checked={selectedAddGrid}
          onChange={(e) => {
            selectAddGrid(e.target.checked);
          }}
        />
        Add Grid (uncheck if you need a 1:1 template)
      </p>
      {(selectedAddGrid)
        ? (
          <div style={{
            borderStyle: 'solid',
            borderColor: '#D4D4D4',
            borderWidth: 2,
            padding: 5,
            display: 'inline-block',
          }}
          >
            <p style={{ ...textStyle, fontHeight: 16 }}>
              <input
                type="checkbox"
                onChange={(e) => {
                  selectLightGrid(e.target.checked);
                }}
              />
              Light Grid
            </p>
            <span style={textStyle}>Offset X:&nbsp;
              <input
                type="number"
                step="1"
                min="0"
                max="10"
                style={{ width: '2em' }}
                value={selectedGridOffsetX}
                onChange={(e) => {
                  selectGridOffsetX(e.target.value);
                }}
              />%
            </span>
            <span style={textStyle}>Offset Y:&nbsp;
              <input
                type="number"
                step="1"
                min="0"
                max="10"
                style={{ width: '2em' }}
                value={selectedGridOffsetY}
                onChange={(e) => {
                  selectGridOffsetY(e.target.value);
                }}
              />%
            </span>
          </div>
        )
        : null}
      <p style={{ ...textStyle, fontHeight: 16 }}>
        <input
          type="checkbox"
          checked={selectedDoScaling}
          onChange={(e) => {
            selectDoScaling(e.target.checked);
          }}
        />
        Scale Image
      </p>
      {(selectedDoScaling)
        ? (
          <div style={{
            borderStyle: 'solid',
            borderColor: '#D4D4D4',
            borderWidth: 2,
            padding: 5,
            display: 'inline-block',
          }}
          >
            <span style={textStyle}>Width:&nbsp;
              <input
                type="number"
                step="1"
                min="1"
                max="16564"
                style={{ width: '3em' }}
                value={selectedScaleWidth}
                onChange={(e) => {
                  const newWidth = e.target.value;
                  if (!newWidth) return;
                  if (selectedScaleKeepRatio && selectedFile) {
                    const ratio = selectedFile.width / selectedFile.height;
                    const newHeight = Math.round(newWidth / ratio);
                    selectScaleHeight(newHeight);
                  }
                  selectScaleWidth(newWidth);
                }}
              />%
            </span>
            <span style={textStyle}>Height:&nbsp;
              <input
                type="number"
                step="1"
                min="1"
                max="16564"
                style={{ width: '3em' }}
                value={selectedScaleHeight}
                onChange={(e) => {
                  const nuHeight = e.target.value;
                  if (!nuHeight) return;
                  if (selectedScaleKeepRatio && selectedFile) {
                    const ratio = selectedFile.width / selectedFile.height;
                    const nuWidth = Math.round(ratio * nuHeight);
                    selectScaleWidth(nuWidth);
                  }
                  selectScaleHeight(nuHeight);
                }}
              />%
            </span>
            <p style={{ ...textStyle, fontHeight: 16 }}>
              <input
                type="checkbox"
                checked={selectedScaleKeepRatio}
                onChange={(e) => {
                  selectScaleKeepRatio(e.target.checked);
                }}
              />
              Keep Ratio
            </p>
            <p style={{ ...textStyle, fontHeight: 16 }}>
              <input
                type="checkbox"
                onChange={(e) => {
                  selectScaleAA(e.target.checked);
                }}
              />
              Anti Aliasing
            </p>
            <button
              type="button"
              onClick={() => {
                if (selectedFile) {
                  selectScaleWidth(selectedFile.width);
                  selectScaleHeight(selectedFile.height);
                }
              }}
            >
              Reset
            </button>
          </div>
        )
        : null}
      <p>
        <canvas
          id="imgoutput"
          style={{ width: '80%', imageRendering: 'crisp-edges' }}
        />
      </p>
      <button
        type="button"
        onClick={downloadOutput}
      >
        Download Template
      </button>
    </p>
  );
}

function mapStateToProps(state: State) {
  const { canvasId, canvases } = state.canvas;
  return { canvasId, canvases };
}

export default connect(mapStateToProps)(Converter);
