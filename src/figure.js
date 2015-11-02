'use strict';

var Utils = require('./utils');
var Selection = require('./selection');
var Component = require('./component');
var Paragrarph = require('./paragraph');

/**
 * Figure main.
 * @param {Object} optParams Optional params to initialize the Figure object.
 * Default:
 *   {
 *     src: '',
 *     caption: null,
 *     width: '100%'
 *     name: Utils.getUID()
 *   }
 */
var Figure = function(optParams) {
  // Override default params with passed ones if any.
  var params = Utils.extend({
    src: '',
    caption: null,
    width: '100%',
  }, optParams);

  Component.call(this, params);

  /**
   * Internal model text in this Figure.
   * @type {string}
   */
  this.src = params.src;

  /**
   * Wether this figure is initialized with Data URL.
   * @type {boolean}
   */
  this.isDataUrl = !!params.src && params.src.indexOf('http') !== 0;

  /**
   * Width of the figure.
   * @type {string}
   */
  this.width = params.width;

  /**
   * Placeholder text to show if the Figure is empty.
   * @type {string}
   */
  this.caption = params.caption;

  /**
   * Placeholder text to show if the Figure is empty.
   * @type {string}
   */
  this.captionParagraph = new Paragrarph({
    placeholderText: 'Type caption for image',
    text: params.caption,
    paragraphType: Paragrarph.Types.Caption,
    parentComponent: this,
    inline: true
  });

  /**
   * DOM element tied to this object.
   * @type {HTMLElement}
   */
  this.dom = document.createElement(Figure.CONTAINER_TAG_NAME);
  this.dom.setAttribute('contenteditable', false);
  this.dom.setAttribute('name', this.name);

  this.imgDom = document.createElement(Figure.IMAGE_TAG_NAME);
  this.imgDom.addEventListener('click', this.handleClick.bind(this));

  if (this.src) {
    this.imgDom.setAttribute('src', this.src);
    if (this.width) {
      this.imgDom.setAttribute('width', this.width);
    }
    this.dom.appendChild(this.imgDom);
  }

  this.captionDom = this.captionParagraph.dom;
  this.captionDom.setAttribute('contenteditable', true);
  this.dom.appendChild(this.captionDom);
};
Figure.prototype = Object.create(Component.prototype);
module.exports = Figure;


/**
 * String name for the component class.
 * @type {string}
 */
Figure.CLASS_NAME = 'Figure';


/**
 * Figure component container element tag name.
 * @type {string}
 */
Figure.CONTAINER_TAG_NAME = 'figure';


/**
 * Image element tag name.
 * @type {string}
 */
Figure.IMAGE_TAG_NAME = 'img';


/**
 * Caption element tag name.
 * @type {string}
 */
Figure.CAPTION_TAG_NAME = 'figcaption';


/**
 * Regex strings list that for matching image URLs.
 * @type {Array.<string>}
 */
Figure.IMAGE_URL_REGEXS = [
    'https?://(.*)\.(jpg|png|gif|jpeg)$'
];


/**
 * Handles onInstall when Paragrarph module is installed in an editor.
 * @param  {Editor} editor Instance of the editor that installed the module.
 */
Figure.onInstall = function(editor) {
  Figure.registerRegexes_(editor);
  // TODO(mkhatib): Initialize a toolbar for all Figure components instances.
};


/**
 * Registers regular experessions to create image from if matched.
 * @param  {Editor} editor The editor to register the regex with.
 */
Figure.registerRegexes_ = function(editor) {
  for (var i = 0; i < Figure.IMAGE_URL_REGEXS.length; i++) {
    editor.registerRegex(
        Figure.IMAGE_URL_REGEXS[i],
        Figure.handleMatchedRegex);
  }
};


/**
 * Creates a figure component from a link.
 * @param {Component} matchedComponent Component that matched registered regex.
 * @param {Function} opsCallback Callback to send list of operations to exectue.
 */
Figure.handleMatchedRegex = function (matchedComponent, opsCallback) {
  var src = matchedComponent.text;
  var atIndex = matchedComponent.getIndexInSection();
  var ops = [];
  var figure = new Figure({src: src});
  figure.section = matchedComponent.section;

  // Delete current matched component with its text.
  Utils.arrays.extend(ops, matchedComponent.getDeleteOps(atIndex));

  // Add the new component created from the text.
  Utils.arrays.extend(ops, figure.getInsertOps(atIndex));

  opsCallback(ops);
};


/**
 * Creates and return a JSON representation of the model.
 * @return {Object} JSON representation of this Figure.
 */
Figure.prototype.getJSONModel = function() {
  var image = {
    name: this.name,
    caption: this.captionParagraph.getJSONModel()
  };

  if (!this.isDataUrl) {
    image.src = this.src;
  }

  return image;
};


/**
 * Handles clicking on the figure component to update the selection.
 */
Figure.prototype.handleClick = function () {
  var selection = Selection.getInstance();
  selection.setCursor({
    component: this,
    offset: 0
  });
};


/**
 * Returns the operations to execute a deletion of the image component.
 * @param  {number=} optIndexOffset An offset to add to the index of the
 * component for insertion point.
 * @return {Array.<Object>} List of operations needed to be executed.
 */
Figure.prototype.getDeleteOps = function (optIndexOffset) {
  return [{
    do: {
      op: 'deleteComponent',
      component: this.name
    },
    undo: {
      op: 'insertComponent',
      componentClass: 'Figure',
      section: this.section.name,
      component: this.name,
      index: this.getIndexInSection() + (optIndexOffset || 0),
      attrs: {
        src: this.src,
        caption: this.caption,
        width: this.width
      }
    }
  }];
};


/**
 * Returns the operations to execute inserting a figure.
 * @param {number} index Index to insert the figure at.
 * @return {Array.<Object>} Operations for inserting the figure.
 */
Figure.prototype.getInsertOps = function (index) {
  return [{
    do: {
      op: 'insertComponent',
      componentClass: 'Figure',
      section: this.section.name,
      cursorOffset: 0,
      component: this.name,
      index: index,
      attrs: {
        src: this.src,
        width: this.width,
        caption: this.caption
      }
    },
    undo: {
      op: 'deleteComponent',
      component: this.name
    }
  }];
};


/**
 * Returns the length of the figure content.
 * @return {number} Length of the figure content.
 */
Figure.prototype.getLength = function () {
  return 1;
};


/**
 * Updates figure attributes.
 * @param  {Object} attrs Attributes to update.
 */
Figure.prototype.updateAttributes = function(attrs) {
  if (attrs.src) {
    this.updateSource(attrs.src);
  }

  if (attrs.caption) {
    this.updateCaption(attrs.caption);
  }
};


/**
 * Updates the source attribute for the figure and its dom.
 * @param  {string} src Image source.
 */
Figure.prototype.updateSource = function(src) {
  this.src = src;
  this.isDataUrl = !!this.src && this.src.indexOf('http') !== 0;
  this.imgDom.setAttribute('src', src);
};


/**
 * Updates figure caption and its dom.
 * @param  {string} caption Caption text to update to.
 */
Figure.prototype.updateCaption = function(caption) {
  this.caption = caption;
  this.captionParagraph.setText(caption);
};