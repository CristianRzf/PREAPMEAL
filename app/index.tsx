import { useState } from "react";

import {
  ActivityIndicator,
  Button,
  KeyboardAvoidingView,
  TextInput,
  View
} from "react-native";

import { StyleSheet } from "react-native";
//
import auth from "@react-native-firebase/auth";
import { FirebaseError } from "firebase/app";

export default function Index() {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const signUp = async () => {
    setLoading(true);
    try {
      await auth().createUserWithEmailAndPassword(email, password);
      alert("Check your emails");
    } catch (e: any) {
      const err = e as FirebaseError;
      alert("El registro fallo: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async () => {
    setLoading(true);
    try {
      await auth().signInWithEmailAndPassword(email, password);
    } catch (e: any) {
      const err = e as FirebaseError;
      alert("El sign in fallo: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView behavior="padding">

        <TextInput
          value={email}
          style={styles.input}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="Email"
        />

        <TextInput
          value={password}
          style={styles.input}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Password"
        />

        {loading ? (
          <ActivityIndicator size="small" style={{ margin: 28 }} />
        ) : (
          <>
            <Button onPress={signUp} title="Sign Up" />
            <Button onPress={signIn} title="Sign In" />
          </>
        )}

      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20
  },
  input: {
    height: 40,
    borderWidth: 1,
    marginBottom: 10,
    padding: 10
  }
});