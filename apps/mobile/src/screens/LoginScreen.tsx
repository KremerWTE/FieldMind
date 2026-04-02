import React, { useState, useRef } from 'react';
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
  ScrollView,
} from 'react-native';
import apiService from '../services/api.service';

interface LoginScreenProps {
  onLoginSuccess: () => void;
  navigation: any;
}

export default function LoginScreen({ onLoginSuccess, navigation }: LoginScreenProps) {
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handlePinChange = async (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 8);
    setPin(digits);

    if (digits.length === 8) {
      await submitPin(digits);
    }
  };

  const submitPin = async (pinValue: string) => {
    setIsLoading(true);
    try {
      await apiService.loginWithPin(pinValue);
      onLoginSuccess();
    } catch (error: any) {
      const msg =
        error.response?.data?.message || error.message || 'Invalid PIN. Please try again.';
      Alert.alert('Login Failed', msg);
      setPin('');
      inputRef.current?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (preset: '12345678' | '87654321' | '11223344') => {
    handlePinChange(preset);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>FM</Text>
          <Text style={styles.title}>FieldMind</Text>
          <Text style={styles.subtitle}>AI-Powered Property Intelligence</Text>
        </View>

        {/* PIN Entry */}
        <View style={styles.pinSection}>
          <Text style={styles.pinLabel}>Enter your 8-digit PIN</Text>

          {/* Dot indicators */}
          <TouchableOpacity
            style={styles.dotsContainer}
            onPress={() => inputRef.current?.focus()}
            activeOpacity={1}
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i < pin.length ? styles.dotFilled : styles.dotEmpty,
                  i === pin.length && !isLoading ? styles.dotActive : null,
                ]}
              />
            ))}
          </TouchableOpacity>

          {/* Hidden input to capture keystrokes */}
          <TextInput
            ref={inputRef}
            style={styles.hiddenInput}
            value={pin}
            onChangeText={handlePinChange}
            keyboardType="number-pad"
            maxLength={8}
            autoFocus
            editable={!isLoading}
            caretHidden
          />

          {isLoading && (
            <ActivityIndicator size="large" color="#2563eb" style={styles.spinner} />
          )}

          {!isLoading && pin.length > 0 && (
            <TouchableOpacity onPress={() => setPin('')} style={styles.clearButton}>
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPin')}
            style={styles.forgotPinLink}
          >
            <Text style={styles.forgotPinText}>Forgot your PIN?</Text>
          </TouchableOpacity>
        </View>

        {/* Dev quick-login */}
        {__DEV__ && (
          <View style={styles.devSection}>
            <Text style={styles.devTitle}>Dev Quick Login</Text>
            <View style={styles.devButtons}>
              <TouchableOpacity
                style={styles.devButton}
                onPress={() => handleQuickLogin('12345678')}
                disabled={isLoading}
              >
                <Text style={styles.devButtonText}>Admin</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.devButton}
                onPress={() => handleQuickLogin('87654321')}
                disabled={isLoading}
              >
                <Text style={styles.devButtonText}>PM</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.devButton}
                onPress={() => handleQuickLogin('11223344')}
                disabled={isLoading}
              >
                <Text style={styles.devButtonText}>Tech</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scroll: {
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 80 : 60,
    paddingBottom: 40,
    backgroundColor: '#2563eb',
  },
  logo: {
    fontSize: 48,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 8,
    letterSpacing: 2,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#dbeafe',
  },
  pinSection: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: 24,
  },
  pinLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 32,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  dotEmpty: {
    backgroundColor: '#e5e7eb',
    borderWidth: 2,
    borderColor: '#d1d5db',
  },
  dotFilled: {
    backgroundColor: '#2563eb',
    borderWidth: 2,
    borderColor: '#2563eb',
  },
  dotActive: {
    borderColor: '#2563eb',
    borderWidth: 2,
    backgroundColor: '#eff6ff',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 0,
    width: 0,
  },
  spinner: {
    marginTop: 8,
  },
  clearButton: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 24,
  },
  clearButtonText: {
    color: '#6b7280',
    fontSize: 15,
  },
  forgotPinLink: {
    marginTop: 32,
    paddingVertical: 8,
  },
  forgotPinText: {
    color: '#2563eb',
    fontSize: 15,
  },
  devSection: {
    marginTop: 48,
    marginHorizontal: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    alignItems: 'center',
  },
  devTitle: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 12,
  },
  devButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  devButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  devButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
