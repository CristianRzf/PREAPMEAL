import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { router, Stack } from "expo-router";

export default function Register() {

  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleRegister = () => {
    console.log(email, confirmEmail, password, confirmPassword);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >

          <View style={styles.container}>

            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.back}>← Volver</Text>
            </TouchableOpacity>

            <Image
              source={require("../assets/images/logo.png")}
              style={styles.logo}
            />

            <Text style={styles.title}>Registrarse</Text>

            <Text style={styles.label}>Ingresa tu correo electrónico</Text>
            <TextInput
              style={styles.input}
              placeholder="correoelectrónico@dominio.com"
              value={email}
              onChangeText={setEmail}
            />

            <Text style={styles.label}>Confirma tu correo electrónico</Text>
            <TextInput
              style={styles.input}
              placeholder="correoelectrónico@dominio.com"
              value={confirmEmail}
              onChangeText={setConfirmEmail}
            />

            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              style={styles.input}
              placeholder="Ingresa tu contraseña"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <Text style={styles.label}>Confirmar contraseña</Text>
            <TextInput
              style={styles.input}
              placeholder="Ingresa tu contraseña"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            <TouchableOpacity style={styles.button} onPress={handleRegister}>
              <Text style={styles.buttonText}>Continuar</Text>
            </TouchableOpacity>

            <View style={styles.separatorContainer}>
              <View style={styles.line}/>
              <Text style={styles.separator}>o</Text>
              <View style={styles.line}/>
            </View>

            <TouchableOpacity style={styles.googleButton}>
              <Image
                source={{uri:"https://cdn-icons-png.flaticon.com/512/2991/2991148.png"}}
                style={styles.googleIcon}
              />
              <Text style={styles.googleText}>Continuar con Google</Text>
            </TouchableOpacity>

            <Text style={styles.login}>
              ¿Ya tienes cuenta?{" "}
              <Text
                style={styles.loginLink}
                onPress={() => router.push("/login")}
              >
                Inicia sesión
              </Text>
            </Text>

            <Text style={styles.terms}>
              Al hacer clic en “continuar” aceptas nuestros Términos de servicio y Política de privacidad
            </Text>

          </View>

        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({

  safeArea:{
    flex:1,
    backgroundColor:"#F5F5F5"
  },

  scroll:{
    paddingBottom:50
  },

  container:{
    padding:25
  },

  back:{
    fontSize:16,
    marginBottom:10
  },

  logo:{
    width:100,
    height:100,
    alignSelf:"center",
    marginBottom:10
  },

  title:{
    fontSize:22,
    fontWeight:"bold",
    textAlign:"center",
    marginBottom:20
  },

  label:{
    marginTop:10,
    marginBottom:5
  },

  input:{
    backgroundColor:"#fff",
    padding:14,
    borderRadius:10,
    marginBottom:5,
    elevation:3
  },

  button:{
    backgroundColor:"#000",
    padding:14,
    borderRadius:10,
    alignItems:"center",
    marginTop:15
  },

  buttonText:{
    color:"#fff",
    fontWeight:"bold"
  },

  separatorContainer:{
    flexDirection:"row",
    alignItems:"center",
    marginVertical:20
  },

  line:{
    flex:1,
    height:1,
    backgroundColor:"#ccc"
  },

  separator:{
    marginHorizontal:10,
    color:"#888"
  },

  googleButton:{
    backgroundColor:"#eee",
    padding:14,
    borderRadius:10,
    flexDirection:"row",
    alignItems:"center",
    justifyContent:"center",
    gap:10
  },

  googleIcon:{
    width:20,
    height:20
  },

  googleText:{
    fontWeight:"500"
  },

  login:{
    marginTop:15,
    textAlign:"center"
  },

  loginLink:{
    color:"#007AFF",
    fontWeight:"bold"
  },

  terms:{
    fontSize:12,
    textAlign:"center",
    color:"#666",
    marginTop:20
  }

});