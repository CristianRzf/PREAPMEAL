import { router } from "expo-router";
import { useState } from "react";
import { Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function Login() {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    console.log({ email, password });
  };

  return (
    <View style={styles.container}>

      {/* Logo */}
      <Image
        source={require("../assets/images/logo.png")}
        style={styles.logo}
      />

      {/* Título */}
      <Text style={styles.title}>Iniciar sesión</Text>

      <Text style={styles.subtitle}>
        Ingresa tu correo electrónico{"\n"}para iniciar sesión
      </Text>

      {/* Email */}
      <Text style={styles.label}>Email</Text>

      <TextInput
        placeholder="correoelectrónico@dominio.com"
        style={styles.input}
        value={email}
        onChangeText={setEmail}
      />

      {/* Password */}
      <Text style={styles.label}>Contraseña</Text>

      <TextInput
        placeholder="Ingresa tu contraseña"
        secureTextEntry
        style={styles.input}
        value={password}
        onChangeText={setPassword}
      />

      {/* Botón */}
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Continuar</Text>
      </TouchableOpacity>

      {/* Forgot password */}
      <Text style={styles.forgot}>¿Olvidaste tu contraseña?</Text>

      {/* Separador */}
      <View style={styles.separatorContainer}>
        <View style={styles.line}/>
        <Text style={styles.separator}>o</Text>
        <View style={styles.line}/>
      </View>

      {/* Google */}
      <TouchableOpacity style={styles.googleButton}>
        <Image
          source={{uri:"https://cdn-icons-png.flaticon.com/512/2991/2991148.png"}}
          style={styles.googleIcon}
        />
        <Text style={styles.googleText}>Continuar con Google</Text>
      </TouchableOpacity>

      {/* Register */}
      <Text style={styles.register}>
        ¿Aún no tienes cuenta?{" "}
        <Text style={styles.registerLink} onPress={() => router.push("/register")}>
          Regístrate
        </Text>
      </Text>

      {/* Terms */}
      <Text style={styles.terms}>
        Al hacer clic en "continuar" aceptas nuestros Términos de servicio y Política de privacidad
      </Text>

    </View>
  );
}

const styles = StyleSheet.create({

  container:{
    flex:1,
    backgroundColor:"#F5F5F5",
    padding:25,
    alignItems:"center",
    justifyContent:"center"
  },

  logo:{
    width:140,
    height:140,
    marginBottom:10
  },

  title:{
    fontSize:24,
    fontWeight:"bold",
    marginTop:10
  },

  subtitle:{
    textAlign:"center",
    color:"#555",
    marginBottom:20
  },

  label:{
    alignSelf:"flex-start",
    marginTop:10,
    marginBottom:5
  },

  input:{
    width:"100%",
    backgroundColor:"#fff",
    padding:14,
    borderRadius:10,
    marginBottom:10,
    elevation:3
  },

  button:{
    width:"100%",
    backgroundColor:"#000",
    padding:12,
    borderRadius:10,
    alignItems:"center",
    marginTop:10
  },

  buttonText:{
    color:"#fff",
    fontWeight:"bold"
  },

  forgot:{
    marginTop:10,
    color:"#333"
  },

  separatorContainer:{
    flexDirection:"row",
    alignItems:"center",
    marginVertical:20,
    width:"100%"
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
    width:"100%",
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

  register:{
    marginTop:15
  },

  registerLink:{
    color:"#007AFF",
    fontWeight:"bold"
  },

  terms:{
    fontSize:12,
    textAlign:"center",
    color:"#666",
    marginTop:25
  }

});
