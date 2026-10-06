import { useEffect, useState } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { useWorkspace } from "../../../ConnectedApp";
import { Screen, Card, Body, Button } from "../../components/field-ui";
import { errorMessage } from "@logskies/api";
export default function AuthCallback() {
  const { code, error } = useLocalSearchParams<{
    code?: string;
    error?: string;
  }>();
  const { completeGoogleSignIn } = useWorkspace();
  const [message, setMessage] = useState("Completing Google sign-in…");
  useEffect(() => {
    let active = true;
    if (error || !code || typeof code !== "string") {
      return;
    }
    completeGoogleSignIn(code)
      .then(() => {
        if (active) router.replace("/(tabs)/home");
      })
      .catch((e) => {
        if (active) setMessage(errorMessage(e));
      });
    return () => {
      active = false;
    };
  }, [code, error, completeGoogleSignIn]);
  return (
    <Screen title="Google sign-in">
      <Card>
        <Body>{error || !code || typeof code !== "string" ? "Google sign-in was not completed. Please try again." : message}</Body>
        <Button
          secondary
          title="Back to sign in"
          onPress={() => router.replace("/")}
        />
      </Card>
    </Screen>
  );
}
