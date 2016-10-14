import React from 'react';
import _ from 'lodash';
import * as d3 from 'd3';

import Visualization from './Visualization';
import Characters from './Characters';
import Themes from './Themes';
import LineSummary from './LineSummary';
import ProcessGraph from './ProcessGraph';

import charList from './data/char_list.json';

var width = 1000;
var characterWidth = 620;
var themeWidth = width - characterWidth;
var filterHeight = 220;

var App = React.createClass({

  getInitialState() {
    var images = _.reduce(charList, (obj, character, id) => {
      try {
        // load image
        obj[id] = require('./images/' + id + '.png');
      } catch(e) {
        console.log(e);
      }
      return obj;
    }, {});
    return {
      update: true,
      hovered: null,
      sideHovered: null,
      lines: [],
      diamonds: [],
      songs: [],
      groupedThemes: [],
      characters: [],
      conversations: [],
      characterNodes: [],
      characterLinks: [],
      linePositions: [],
      diamondPositions: [],
      songPositions: [],
      selectedCharacters: [],
      selectedConversation: [],
      selectedThemes: [],
      images,
      gray: '#eee',
    };
  },

  componentWillMount() {
    var {lines, songs} = ProcessGraph.processLinesSongs(width);

    var {characterNodes, characterLinks} = ProcessGraph.processCharacters(lines, characterWidth, filterHeight);

    var {diamonds, groupedThemes} = ProcessGraph.processThemes(lines);
    this.filterAndPosition(this.state.selectedCharacters,
      this.state.selectedConversation, this.state.selectedThemes,
      characterNodes, characterLinks, lines, songs, diamonds, groupedThemes);
  },

  filterByCharacter(character) {
    var selectedCharacters = this.state.selectedCharacters;
    if (_.includes(selectedCharacters, character)) {
      selectedCharacters = _.without(selectedCharacters, character);
    } else {
      selectedCharacters.push(character);
    }
    selectedCharacters = _.sortBy(selectedCharacters);

    this.filterAndPosition(selectedCharacters, this.state.selectedConversation,
      this.state.selectedThemes, this.state.characters, this.state.conversations,
      this.state.lines, this.state.songs, this.state.diamonds, this.state.groupedThemes);
  },

  filterByConversation(id) {
    var selectedConversation = this.state.selectedConversation;
    if (_.includes(selectedConversation, id)) {
      selectedConversation = _.without(selectedConversation, id);
    } else {
      selectedConversation.push(id);
    }

    this.filterAndPosition(this.state.selectedCharacters, selectedConversation,
      this.state.selectedThemes, this.state.characters, this.state.conversations,
      this.state.lines, this.state.songs, this.state.diamonds, this.state.groupedThemes);
  },

  filterByThemes(id) {
    var selectedThemes = this.state.selectedThemes;
    if (_.includes(selectedThemes, id)) {
      selectedThemes = _.without(selectedThemes, id);
    } else {
      selectedThemes.push(id);
    }

    this.filterAndPosition(this.state.selectedCharacters, this.state.selectedConversation,
      selectedThemes, this.state.characters, this.state.conversations,
      this.state.lines, this.state.songs, this.state.diamonds, this.state.groupedThemes);
  },

  resetFilters() {
    var selectedCharacters = [];
    var selectedConversation = [];
    var selectedThemes = [];

    this.filterAndPosition(selectedCharacters, selectedConversation,
      selectedThemes, this.state.characters, this.state.conversations,
      this.state.lines, this.state.songs, this.state.diamonds, this.state.groupedThemes);
  },

  filterAndPosition(selectedCharacters, selectedConversation, selectedThemes,
    characters, conversations, lines, songs, diamonds, themes) {
    var {filteredLines} = ProcessGraph.filterLinesBySelectedCharacter(
      selectedCharacters, selectedConversation, lines);
    var {filteredLines2} = ProcessGraph.filterLinesBySelectedThemes(selectedThemes, filteredLines);
    var {filteredDiamonds} = ProcessGraph.filterDiamondsByRemainingLines(filteredLines2, diamonds);
    var {characterNodes, characterLinks, groupedThemes} =
      ProcessGraph.updateFilterOpacities(filteredLines2, filteredDiamonds, songs,
        selectedCharacters, selectedConversation, selectedThemes,
        characters, conversations, themes);
    // var {linePositions, songPositions, diamondPositions} =
    //   ProcessGraph.positionLinesBySong(filteredLines2, filteredDiamonds, songs, width);
    var {linePositions, songPositions, diamondPositions} =
      ProcessGraph.positionLinesAsImage(filteredLines2);

    this.setState({
      update: true,
      selectedCharacters, selectedConversation, selectedThemes,
      linePositions, songPositions, diamondPositions,
      characters, conversations, characterNodes, characterLinks,
      lines, songs, diamonds, groupedThemes,
    });
  },

  hoverLine(hoveredLine) {
    // TODO: fix x-position to not be hardcoded
    var hovered = hoveredLine && {
      title: hoveredLine.characterName,
      lines: hoveredLine.data[2],
      x: hoveredLine.x,
      y: hoveredLine.y,
      color: hoveredLine.fill,
      image: this.state.images[hoveredLine.characterId],
    };
    this.setState({hovered, update: false});
  },

  hoverTheme(hoveredTheme) {
    var hovered = hoveredTheme && {
      title: hoveredTheme.themeType,
      lines: hoveredTheme.lines,
      x: hoveredTheme.positions[0].x,
      y: hoveredTheme.positions[0].y,
    }
    this.setState({hovered, update: false});
  },

  hoverSideTheme(hoveredTheme) {
    var sideHovered = hoveredTheme && {
      lines: hoveredTheme.lines,
      x: d3.event.x,
      y: d3.event.y,
    }
    this.setState({sideHovered, update: false});
  },

  render() {
    var style = {
      width,
      margin: 'auto',
    }
    var vizHeight = 2400;
    var sideStyle = {
      width,
      height: filterHeight,
      verticalAlign: 'top',
    };
    var characterStyle = {
      width: characterWidth,
      height: filterHeight,
    };
    var themeStyle = {
      width: themeWidth,
      height: filterHeight,
      display: 'inline-block',
    };
    var vizStyle = {
      width,
      height: vizHeight,
      position: 'relative',
      display: 'inline-block',
    };
    var resetFilter = this.state.selectedCharacters.length ||
      this.state.selectedConversation.length || this.state.selectedThemes.length;
    var resetFilterStyle = {
      color: resetFilter ? '#000' : this.state.gray,
      cursor: resetFilter ? 'pointer' : 'default',
    };

    return (
      <div className="App" style={style}>
        <div style={{textAlign: 'center'}}>
          <h1>Filters</h1>
          <h3 style={resetFilterStyle} onClick={this.resetFilters}>(reset filters)</h3>
        </div>
        <div style={sideStyle}>
          <Characters {...this.state} {...this.props} {...characterStyle}
            onSelectCharacter={this.filterByCharacter}
            onSelectConversation={this.filterByConversation} />
          <Themes {...this.state} {...this.props} {...themeStyle}
            onHoverTheme={this.hoverSideTheme}
            onSelectTheme={this.filterByThemes} />
          <LineSummary {...this.state.sideHovered} />
        </div>
        <div style={vizStyle}>
          <Visualization {...this.state} {...vizStyle}
            onHoverLine={this.hoverLine}
            onHoverTheme={this.hoverTheme} />
          <LineSummary {...this.state.hovered} />
        </div>
      </div>
    );
  }
});

export default App;
