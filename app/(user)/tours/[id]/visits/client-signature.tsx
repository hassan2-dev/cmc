import React from "react";
import { View, StyleSheet, TouchableOpacity, Text } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import SignatureScreen from "react-native-signature-canvas";

export default function ClientSignaturePad() {
  const { id, returnTo } = useLocalSearchParams();

  const handleSignature = (signature: string) => {
    router.push({
      pathname: "/tours/[id]/visits/add-visit",
      params: {
        id: Array.isArray(id) ? id[0] : id,
        signature,
        type: "client",
      },
    });
  };

  const handleClear = () => {
    // Clear signature
  };

  const handleEmpty = () => {
    console.log("Empty signature");
  };

  return (
    <View style={styles.container}>
      <SignatureScreen
        onOK={handleSignature}
        onEmpty={handleEmpty}
        onClear={handleClear}
        descriptionText="توقيع العميل"
        clearText="مسح"
        confirmText="حفظ"
        webStyle={`
          .m-signature-pad {
            width: 100%;
            height: 100%;
            margin: 0;
          }
          .m-signature-pad--body {
            border: none;
          }
          .m-signature-pad--footer {
            display: flex;
            justify-content: space-between;
            padding: 10px;
          }
          .m-signature-pad--footer .button {
            background-color: #007AFF;
            color: #FFF;
            padding: 10px 20px;
            border-radius: 5px;
            margin: 0 10px;
          }
          .m-signature-pad--footer .button.clear {
            background-color: #f1f1f1;
            color: #333;
          }
        `}
        autoClear={true}
        imageType="image/png"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
});
