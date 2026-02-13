import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import apiService from '../services/api.service';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Quick login for testing (remove in production)
  const quickLogin = (userType: 'admin' | 'pm' | 'tech') => {
    const credentials = {
      admin: { email: 'admin@fieldmind.io', password: 'password123' },
      pm: { email: 'pm@fieldmind.io', password: 'password123' },
      tech: { email: 'tech@fieldmind.io', password: 'password123' },
    };
    setEmail(credentials[userType].email);
    setPassword(credentials[userType].password);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing Information', 'Please enter email and password');
      return;
    }

    setIsLoading(true);

    try {
      const { user } = await apiService.login(email, password);
      console.log('Login successful:', user);

      // Navigate to main app
      navigation.replace('JobSiteSelect');
    } catch (error: any) {
      console.error('Login failed:', error);

      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'Login failed. Please check your credentials.';

      Alert.alert('Login Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Text style={styles.logo}>📱</Text>
        <Text style={styles.title}>FieldMind</Text>
        <Text style={styles.subtitle}>Photo Documentation & AI Analysis</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="email@example.com"
          placeholderTextColor="#9ca3af"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoCorrect={false}
          editable={!isLoading}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your password"
          placeholderTextColor="#9ca3af"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isLoading}
        />

        <TouchableOpacity
          style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.loginButtonText}>Login</Text>
          )}
        </TouchableOpacity>

        {/* Quick Login for Testing */}
        <View style={styles.quickLoginSection}>
          <Text style={styles.quickLoginTitle}>Quick Login (Testing):</Text>
          <View style={styles.quickLoginButtons}>
            <TouchableOpacity
              style={styles.quickLoginButton}
              onPress={() => quickLogin('admin')}
              disabled={isLoading}
            >
              <Text style={styles.quickLoginButtonText}>Admin</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickLoginButton}
              onPress={() => quickLogin('pm')}
              disabled={isLoading}
            >
              <Text style={styles.quickLoginButtonText}>PM</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickLoginButton}
              onPress={() => quickLogin('tech')}
              disabled={isLoading}
            >
              <Text style={styles.quickLoginButtonText}>Tech</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>FieldMind v1.0</Text>
        <Text style={styles.footerText}>AI-Powered Property Intelligence</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 80 : 60,
    paddingBottom: 40,
    backgroundColor: '#2563eb',
  },
  logo: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#dbeafe',
  },
  form: {
    flex: 1,
    padding: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1f2937',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  loginButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loginButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  quickLoginSection: {
    marginTop: 40,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  quickLoginTitle: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 12,
    textAlign: 'center',
  },
  quickLoginButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  quickLoginButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  quickLoginButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#9ca3af',
    marginVertical: 2,
  },
});
