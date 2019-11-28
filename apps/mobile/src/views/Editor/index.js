import React, {useEffect, useState, createRef} from 'react';
import {
  View,
  SafeAreaView,
  Keyboard,
  LayoutAnimation,
  Platform,
  Linking,
  DeviceEventEmitter,
  KeyboardAvoidingView,
  Dimensions,
  TextInput,
} from 'react-native';
import {
  COLOR_SCHEME,
  SIZE,
  br,
  ph,
  pv,
  opacity,
  FONT,
  WEIGHT,
} from '../../common/common';
import WebView from 'react-native-webview';
import Icon from 'react-native-vector-icons/Ionicons';
import {useForceUpdate} from '../ListsEditor';
import {NavigationEvents} from 'react-navigation';
import {storage} from '../../../App';

const w = Dimensions.get('window').width;
const h = Dimensions.get('window').height;

var timestamp = null;
var content = null;
var title = null;

const Editor = ({navigation}) => {
  // STATE

  const [colors, setColors] = useState(COLOR_SCHEME);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // VARIABLES

  let updateInterval = null;
  let keyboardDidShowListener = null;
  let keyboardDidHideListener = null;

  // REFS

  let EditorWebView = createRef();
  const _textRender = createRef();
  const titleRef = createRef();

  // FUNCTIONS

  const _keyboardDidShow = e => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setKeyboardHeight(e.endCoordinates.height);
  };

  const post = value => EditorWebView.current.postMessage(value);

  const _keyboardDidHide = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setKeyboardHeight(0);
  };

  async function onChange(data) {
    if (data !== '') {
      content = JSON.parse(data);
    }
  }

  const saveNote = async () => {
    if (title || content) {
      timestamp = await storage.addNote({
        title,
        content,
        dateCreated: timestamp,
      });
    }
  };

  const _renderWebpage = () => {
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : null}
      style={{height: '100%'}}>
      <View
        style={{
          height: '100%',
        }}>
        <TextInput
          ref={titleRef}
          placeholder="Untitled Note"
          placeholderTextColor={colors.icon}
          style={{
            width: '100%',
            fontFamily: WEIGHT.bold,
            fontSize: SIZE.xxl,
            paddingHorizontal: '3%',
            paddingVertical: 0,
            marginTop: Platform.OS == 'ios' ? h * 0.01 : h * 0.04,
          }}
          onChangeText={value => {
            title = value;
          }}
          onSubmitEditing={async () => await saveNote()}
        />

        <WebView
          ref={EditorWebView}
          onError={error => console.log(error)}
          onLoad={() => {
            if (navigation.state.params.note) {
              let note = navigation.state.params.note;

              post(JSON.stringify(note.content.delta));
            }
          }}
          javaScriptEnabled
          onShouldStartLoadWithRequest={request => {
            if (request.url.includes('https')) {
              Linking.openURL(request.url);
              return false;
            } else {
              return true;
            }
          }}
          cacheEnabled={true}
          cacheMode="LOAD_CACHE_ELSE_NETWORK"
          domStorageEnabled
          scrollEnabled={false}
          bounces={true}
          scalesPageToFit={true}
          source={
            Platform.OS === 'ios'
              ? require('./web/texteditor.html')
              : {
                  uri: 'file:///android_asset/texteditor.html',
                  baseUrl: 'baseUrl:"file:///android_asset/',
                }
          }
          style={{height: '100%', maxHeight: '100%'}}
          onMessage={evt => {
            if (evt.nativeEvent.data !== '') {
              onChange(evt.nativeEvent.data);
            }
          }}
        />
      </View>
    </KeyboardAvoidingView>;
  };

  // EFFECTS

  useEffect(() => {
    if (navigation.state.params.note) {
      let note = navigation.state.params.note;
      titleRef.current.setNativeProps({
        text: note.title,
      });
      title = note.title;
      timestamp = note.dateCreated;
    }
  });

  useEffect(() => {
    keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      _keyboardDidShow,
    );
    keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      _keyboardDidHide,
    );
    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  });

  useEffect(() => {
    updateInterval = setInterval(async function() {
      await saveNote();
    }, 2000);
    return () => {
      saveNote();
      clearInterval(updateInterval);
      updateInterval = null;
    };
  });

  useEffect(() => {
    DeviceEventEmitter.emit('hide');

    return () => {
      DeviceEventEmitter.emit('show');
    };
  });

  return (
    <SafeAreaView style={{height: '100%'}}>
      <NavigationEvents
        onWillFocus={() => {
          DeviceEventEmitter.emit('hide');
        }}
      />
      {_renderWebpage()}
    </SafeAreaView>
  );
};

Editor.navigationOptions = {
  header: null,
};

export default Editor;
