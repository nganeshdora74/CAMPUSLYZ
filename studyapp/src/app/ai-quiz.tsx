import React, { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

const BLUE = "#1677E8";
const DARK = "#092B78";
const PURPLE = "#7C3AED";
const GREEN = "#16A34A";
const RED = "#DC2626";
const ORANGE = "#F59E0B";
const BG = "#F5F8FC";
const BORDER = "#E2E8F0";
const TEXT = "#172033";
const MUTED = "#64748B";

type Question = {
  id: number;
  question: string;
  options: string[];
  answer: string;
  explanation: string;
};

const QUESTION_BANK: Record<string, Question[]> = {
  "Data Structures": [
    {
      id: 1,
      question: "Which data structure follows the LIFO principle?",
      options: ["Queue", "Stack", "Linked List", "Tree"],
      answer: "Stack",
      explanation:
        "A stack follows Last In, First Out (LIFO), meaning the most recently added item is removed first.",
    },
    {
      id: 2,
      question: "What is the average time complexity of binary search?",
      options: ["O(n)", "O(log n)", "O(n²)", "O(1)"],
      answer: "O(log n)",
      explanation:
        "Binary search repeatedly divides the search space in half, giving an average time complexity of O(log n).",
    },
    {
      id: 3,
      question: "Which traversal visits Root, Left, Right?",
      options: ["Inorder", "Postorder", "Preorder", "Level Order"],
      answer: "Preorder",
      explanation:
        "Preorder traversal processes the root first, followed by the left subtree and then the right subtree.",
    },
    {
      id: 4,
      question: "Which data structure is commonly used for BFS?",
      options: ["Stack", "Queue", "Heap", "Hash Table"],
      answer: "Queue",
      explanation:
        "Breadth-First Search uses a queue to process vertices level by level.",
    },
    {
      id: 5,
      question: "Which structure stores data using key-value pairs?",
      options: ["Stack", "Queue", "Hash Table", "Graph"],
      answer: "Hash Table",
      explanation:
        "A hash table stores values associated with unique keys and provides fast average lookup.",
    },
  ],

  "Database Management Systems": [
    {
      id: 1,
      question: "What does SQL stand for?",
      options: [
        "Structured Query Language",
        "Simple Query Language",
        "System Query Logic",
        "Structured Question Language",
      ],
      answer: "Structured Query Language",
      explanation:
        "SQL stands for Structured Query Language and is used to manage and query relational databases.",
    },
    {
      id: 2,
      question: "Which command is used to retrieve data?",
      options: ["INSERT", "UPDATE", "SELECT", "DELETE"],
      answer: "SELECT",
      explanation:
        "The SELECT statement retrieves records from one or more database tables.",
    },
    {
      id: 3,
      question: "Which key uniquely identifies a row?",
      options: ["Foreign Key", "Primary Key", "Candidate Value", "Index Key"],
      answer: "Primary Key",
      explanation:
        "A primary key uniquely identifies each record in a relational table.",
    },
    {
      id: 4,
      question: "Which normal form removes repeating groups?",
      options: ["1NF", "2NF", "3NF", "BCNF"],
      answer: "1NF",
      explanation:
        "First Normal Form requires atomic values and removes repeating groups.",
    },
    {
      id: 5,
      question: "Which SQL command removes a table?",
      options: ["DELETE", "REMOVE", "DROP", "CLEAR"],
      answer: "DROP",
      explanation:
        "DROP TABLE permanently removes the table structure and its data.",
    },
  ],

  "Operating Systems": [
    {
      id: 1,
      question: "Which component manages processes and hardware resources?",
      options: ["Compiler", "Kernel", "Browser", "Database"],
      answer: "Kernel",
      explanation:
        "The operating system kernel manages hardware resources, processes, memory, and system calls.",
    },
    {
      id: 2,
      question: "Which scheduling algorithm uses a time quantum?",
      options: [
        "FCFS",
        "SJF",
        "Round Robin",
        "Priority Scheduling",
      ],
      answer: "Round Robin",
      explanation:
        "Round Robin assigns each process a fixed time quantum before moving to the next process.",
    },
    {
      id: 3,
      question: "What is virtual memory?",
      options: [
        "Extra CPU cache",
        "Memory management technique using disk space",
        "A type of ROM",
        "A programming language",
      ],
      answer: "Memory management technique using disk space",
      explanation:
        "Virtual memory allows disk space to supplement physical RAM when required.",
    },
    {
      id: 4,
      question: "Which condition is associated with deadlock?",
      options: [
        "Circular wait",
        "Compilation",
        "Paging",
        "Caching",
      ],
      answer: "Circular wait",
      explanation:
        "Circular wait is one of the four necessary conditions for deadlock.",
    },
    {
      id: 5,
      question: "What does CPU stand for?",
      options: [
        "Central Processing Unit",
        "Computer Processing Utility",
        "Central Program Unit",
        "Computer Primary Unit",
      ],
      answer: "Central Processing Unit",
      explanation:
        "CPU stands for Central Processing Unit, the primary processor responsible for executing instructions.",
    },
  ],

  "Computer Networks": [
    {
      id: 1,
      question: "How many layers are in the OSI model?",
      options: ["5", "6", "7", "8"],
      answer: "7",
      explanation:
        "The OSI reference model contains seven layers.",
    },
    {
      id: 2,
      question: "Which protocol is connection-oriented?",
      options: ["UDP", "TCP", "IP", "ARP"],
      answer: "TCP",
      explanation:
        "TCP establishes a connection before transferring data and provides reliable delivery.",
    },
    {
      id: 3,
      question: "What does IP stand for?",
      options: [
        "Internet Protocol",
        "Internal Process",
        "Internet Program",
        "Information Protocol",
      ],
      answer: "Internet Protocol",
      explanation:
        "IP stands for Internet Protocol and is responsible for addressing and routing packets.",
    },
    {
      id: 4,
      question: "Which device forwards packets between networks?",
      options: ["Hub", "Switch", "Router", "Repeater"],
      answer: "Router",
      explanation:
        "A router connects different networks and forwards packets based on network addresses.",
    },
    {
      id: 5,
      question: "Which protocol is commonly used to resolve domain names?",
      options: ["HTTP", "DNS", "FTP", "SMTP"],
      answer: "DNS",
      explanation:
        "DNS translates human-readable domain names into IP addresses.",
    },
  ],

  "Object Oriented Programming": [
    {
      id: 1,
      question: "Which concept allows a class to acquire properties from another class?",
      options: [
        "Encapsulation",
        "Inheritance",
        "Abstraction",
        "Compilation",
      ],
      answer: "Inheritance",
      explanation:
        "Inheritance allows a derived class to reuse properties and behavior from a base class.",
    },
    {
      id: 2,
      question: "Which concept hides implementation details?",
      options: [
        "Inheritance",
        "Abstraction",
        "Iteration",
        "Compilation",
      ],
      answer: "Abstraction",
      explanation:
        "Abstraction exposes essential behavior while hiding unnecessary implementation details.",
    },
    {
      id: 3,
      question: "What is polymorphism?",
      options: [
        "One interface with multiple implementations",
        "Creating databases",
        "Removing classes",
        "Sorting objects",
      ],
      answer: "One interface with multiple implementations",
      explanation:
        "Polymorphism allows the same interface or method call to behave differently depending on the object.",
    },
    {
      id: 4,
      question: "Which concept bundles data and methods together?",
      options: [
        "Encapsulation",
        "Inheritance",
        "Recursion",
        "Iteration",
      ],
      answer: "Encapsulation",
      explanation:
        "Encapsulation combines data and related methods while controlling access to internal state.",
    },
    {
      id: 5,
      question: "An object is an instance of what?",
      options: ["Variable", "Class", "Function", "Package"],
      answer: "Class",
      explanation:
        "An object is an instance created from a class definition.",
    },
  ],

  "Software Engineering": [
    {
      id: 1,
      question: "What does SDLC stand for?",
      options: [
        "Software Development Life Cycle",
        "System Design Logic Cycle",
        "Software Data Life Code",
        "System Development Level Control",
      ],
      answer: "Software Development Life Cycle",
      explanation:
        "SDLC stands for Software Development Life Cycle.",
    },
    {
      id: 2,
      question: "Which model is strongly associated with sequential development?",
      options: ["Agile", "Waterfall", "Spiral", "Prototype"],
      answer: "Waterfall",
      explanation:
        "The Waterfall model organizes development into sequential phases.",
    },
    {
      id: 3,
      question: "What is debugging?",
      options: [
        "Writing documentation",
        "Finding and fixing errors",
        "Designing databases",
        "Deploying software",
      ],
      answer: "Finding and fixing errors",
      explanation:
        "Debugging is the process of locating and correcting software defects.",
    },
    {
      id: 4,
      question: "What is a software requirement?",
      options: [
        "A desired capability or constraint",
        "A programming language",
        "A database table",
        "A computer component",
      ],
      answer: "A desired capability or constraint",
      explanation:
        "Requirements describe what the software should do or constraints it must satisfy.",
    },
    {
      id: 5,
      question: "Which approach emphasizes short iterative development cycles?",
      options: ["Waterfall", "Agile", "Big Bang", "V-Model"],
      answer: "Agile",
      explanation:
        "Agile emphasizes iterative development, frequent feedback, and adaptability.",
    },
  ],

  "Engineering Mathematics": [
    {
      id: 1,
      question: "What is the derivative of x²?",
      options: ["x", "2x", "x²", "2"],
      answer: "2x",
      explanation:
        "Using the power rule, d(x²)/dx = 2x.",
    },
    {
      id: 2,
      question: "What is the integral of 1/x?",
      options: ["x", "ln|x| + C", "1/x²", "x²/2"],
      answer: "ln|x| + C",
      explanation:
        "The indefinite integral of 1/x is ln|x| + C.",
    },
    {
      id: 3,
      question: "What is the determinant of a 2×2 identity matrix?",
      options: ["0", "1", "2", "-1"],
      answer: "1",
      explanation:
        "The determinant of the identity matrix is always 1.",
    },
    {
      id: 4,
      question: "What is the probability of getting heads on a fair coin?",
      options: ["0", "1/4", "1/2", "1"],
      answer: "1/2",
      explanation:
        "A fair coin has two equally likely outcomes, so the probability of heads is 1/2.",
    },
    {
      id: 5,
      question: "What is the value of sin(90°)?",
      options: ["0", "1", "-1", "1/2"],
      answer: "1",
      explanation:
        "The sine of 90 degrees is 1.",
    },
  ],

  "Artificial Intelligence": [
    {
      id: 1,
      question: "What does AI stand for?",
      options: [
        "Artificial Intelligence",
        "Automated Information",
        "Advanced Internet",
        "Applied Interface",
      ],
      answer: "Artificial Intelligence",
      explanation:
        "AI stands for Artificial Intelligence.",
    },
    {
      id: 2,
      question: "Which technique can be used to find a path through a search space?",
      options: [
        "Breadth-First Search",
        "Compilation",
        "Normalization",
        "Encryption",
      ],
      answer: "Breadth-First Search",
      explanation:
        "Breadth-First Search explores a search space level by level and can find paths in suitable graphs.",
    },
    {
      id: 3,
      question: "What is machine learning?",
      options: [
        "A method where systems learn patterns from data",
        "A database system",
        "A network cable",
        "A type of operating system",
      ],
      answer: "A method where systems learn patterns from data",
      explanation:
        "Machine learning enables systems to learn patterns and make predictions from data.",
    },
    {
      id: 4,
      question: "What is a neural network inspired by?",
      options: [
        "Computer hard drives",
        "The human brain",
        "Database tables",
        "Network routers",
      ],
      answer: "The human brain",
      explanation:
        "Artificial neural networks are inspired by the interconnected structure of biological neurons.",
    },
    {
      id: 5,
      question: "What is supervised learning?",
      options: [
        "Learning from labeled examples",
        "Learning without data",
        "Deleting training data",
        "Programming without algorithms",
      ],
      answer: "Learning from labeled examples",
      explanation:
        "Supervised learning uses labeled training examples to learn a mapping between inputs and outputs.",
    },
  ],
};

const SUBJECTS = Object.keys(QUESTION_BANK);

export default function AIQuiz() {
  const [selectedSubject, setSelectedSubject] =
    useState("Data Structures");

  const [quizStarted, setQuizStarted] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(
    null
  );
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showResult, setShowResult] = useState(false);

  const currentQuestion = questions[currentIndex];

  const score = useMemo(() => {
    return questions.reduce((total, question) => {
      return total +
        (answers[question.id] === question.answer ? 1 : 0);
    }, 0);
  }, [answers, questions]);

  const percentage = useMemo(() => {
    if (questions.length === 0) return 0;

    return Math.round((score / questions.length) * 100);
  }, [score, questions.length]);

  const startQuiz = () => {
    const bank = QUESTION_BANK[selectedSubject] ?? [];

    if (bank.length === 0) {
      Alert.alert(
        "No questions",
        "There are no questions available for this subject."
      );
      return;
    }

    setQuestions([...bank]);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setAnswers({});
    setShowResult(false);
    setQuizStarted(true);
  };

  const selectAnswer = (answer: string) => {
    if (selectedAnswer !== null) return;

    setSelectedAnswer(answer);

    setAnswers((current) => ({
      ...current,
      [currentQuestion.id]: answer,
    }));
  };

  const nextQuestion = () => {
    if (selectedAnswer === null) {
      Alert.alert(
        "Choose an answer",
        "Please select one option before continuing."
      );
      return;
    }

    if (currentIndex === questions.length - 1) {
      setShowResult(true);
      return;
    }

    setCurrentIndex((current) => current + 1);
    setSelectedAnswer(
      answers[questions[currentIndex + 1]?.id] ?? null
    );
  };

  const restartQuiz = () => {
    startQuiz();
  };

  const chooseDifferentSubject = () => {
    setQuizStarted(false);
    setShowResult(false);
    setQuestions([]);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setAnswers({});
  };

  const getResultMessage = () => {
    if (percentage >= 90) {
      return "Excellent work! You have a strong understanding of this topic.";
    }

    if (percentage >= 70) {
      return "Great job! A little more revision can make you even stronger.";
    }

    if (percentage >= 50) {
      return "Good attempt. Review the explanations and practice again.";
    }

    return "Keep practicing. Focus on the concepts you missed and try again.";
  };

  if (showResult) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Pressable
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Ionicons
                name="arrow-back"
                size={22}
                color={DARK}
              />
            </Pressable>

            <View style={styles.headerText}>
              <Text style={styles.title}>Quiz Result</Text>
              <Text style={styles.subtitle}>
                {selectedSubject}
              </Text>
            </View>
          </View>

          <View style={styles.resultCard}>
            <View style={styles.resultIcon}>
              <Ionicons
                name={
                  percentage >= 70
                    ? "trophy"
                    : "school-outline"
                }
                size={42}
                color={PURPLE}
              />
            </View>

            <Text style={styles.resultTitle}>
              {percentage >= 70
                ? "Well done!"
                : "Keep practicing!"}
            </Text>

            <Text style={styles.resultScore}>
              {score}/{questions.length}
            </Text>

            <Text style={styles.resultPercentage}>
              {percentage}%
            </Text>

            <Text style={styles.resultMessage}>
              {getResultMessage()}
            </Text>
          </View>

          <View style={styles.resultStats}>
            <View style={styles.resultStat}>
              <Ionicons
                name="checkmark-circle"
                size={25}
                color={GREEN}
              />
              <Text style={styles.resultStatValue}>
                {score}
              </Text>
              <Text style={styles.resultStatLabel}>
                Correct
              </Text>
            </View>

            <View style={styles.resultStat}>
              <Ionicons
                name="close-circle"
                size={25}
                color={RED}
              />
              <Text style={styles.resultStatValue}>
                {questions.length - score}
              </Text>
              <Text style={styles.resultStatLabel}>
                Incorrect
              </Text>
            </View>

            <View style={styles.resultStat}>
              <Ionicons
                name="help-circle"
                size={25}
                color={ORANGE}
              />
              <Text style={styles.resultStatValue}>
                {questions.length}
              </Text>
              <Text style={styles.resultStatLabel}>
                Questions
              </Text>
            </View>
          </View>

          <Text style={styles.reviewTitle}>
            Review answers
          </Text>

          {questions.map((question, index) => {
            const userAnswer = answers[question.id];
            const correct = userAnswer === question.answer;

            return (
              <View
                key={question.id}
                style={styles.reviewCard}
              >
                <View style={styles.reviewHeader}>
                  <View
                    style={[
                      styles.reviewNumber,
                      correct
                        ? styles.reviewCorrect
                        : styles.reviewWrong,
                    ]}
                  >
                    <Text style={styles.reviewNumberText}>
                      {index + 1}
                    </Text>
                  </View>

                  <Ionicons
                    name={
                      correct
                        ? "checkmark-circle"
                        : "close-circle"
                    }
                    size={22}
                    color={correct ? GREEN : RED}
                  />
                </View>

                <Text style={styles.reviewQuestion}>
                  {question.question}
                </Text>

                <Text style={styles.yourAnswer}>
                  Your answer:{" "}
                  <Text
                    style={{
                      color: correct ? GREEN : RED,
                      fontWeight: "800",
                    }}
                  >
                    {userAnswer}
                  </Text>
                </Text>

                {!correct && (
                  <Text style={styles.correctAnswer}>
                    Correct answer: {question.answer}
                  </Text>
                )}

                <Text style={styles.explanation}>
                  {question.explanation}
                </Text>
              </View>
            );
          })}

          <Pressable
            onPress={restartQuiz}
            style={styles.primaryButton}
          >
            <Ionicons
              name="refresh"
              size={20}
              color="#FFFFFF"
            />

            <Text style={styles.primaryButtonText}>
              Try Again
            </Text>
          </Pressable>

          <Pressable
            onPress={chooseDifferentSubject}
            style={styles.secondaryButton}
          >
            <Ionicons
              name="library-outline"
              size={20}
              color={BLUE}
            />

            <Text style={styles.secondaryButtonText}>
              Choose Another Subject
            </Text>
          </Pressable>

          <View style={styles.bottomSpace} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (quizStarted && currentQuestion) {
    const isAnswered = selectedAnswer !== null;
    const isCorrect = selectedAnswer === currentQuestion.answer;

    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.quizHeader}>
            <Pressable
              onPress={() => {
                Alert.alert(
                  "Exit quiz?",
                  "Your current quiz progress will be lost.",
                  [
                    {
                      text: "Continue Quiz",
                      style: "cancel",
                    },
                    {
                      text: "Exit",
                      style: "destructive",
                      onPress: chooseDifferentSubject,
                    },
                  ]
                );
              }}
              style={styles.backButton}
            >
              <Ionicons
                name="close"
                size={22}
                color={DARK}
              />
            </Pressable>

            <View style={styles.questionCounter}>
              <Text style={styles.questionCounterText}>
                Question {currentIndex + 1} of {questions.length}
              </Text>
            </View>

            <View style={styles.scoreMini}>
              <Ionicons
                name="star"
                size={15}
                color={ORANGE}
              />

              <Text style={styles.scoreMiniText}>
                {score}
              </Text>
            </View>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${
                    ((currentIndex + 1) /
                      questions.length) *
                    100
                  }%`,
                },
              ]}
            />
          </View>

          <View style={styles.subjectLabel}>
            <Ionicons
              name="book-outline"
              size={16}
              color={BLUE}
            />

            <Text style={styles.subjectLabelText}>
              {selectedSubject}
            </Text>
          </View>

          <View style={styles.questionCard}>
            <View style={styles.questionBadge}>
              <Text style={styles.questionBadgeText}>
                Q{currentIndex + 1}
              </Text>
            </View>

            <Text style={styles.questionText}>
              {currentQuestion.question}
            </Text>
          </View>

          <Text style={styles.optionsLabel}>
            Choose your answer
          </Text>

          {currentQuestion.options.map((option, index) => {
            const selected = selectedAnswer === option;
            const correct =
              option === currentQuestion.answer;

            let optionStyle = styles.option;

            if (isAnswered && correct) {
              optionStyle = styles.optionCorrect;
            } else if (isAnswered && selected && !correct) {
              optionStyle = styles.optionWrong;
            } else if (selected) {
              optionStyle = styles.optionSelected;
            }

            return (
              <Pressable
                key={option}
                onPress={() => selectAnswer(option)}
                disabled={isAnswered}
                style={optionStyle}
              >
                <View
                  style={[
                    styles.optionLetter,
                    isAnswered &&
                      correct &&
                      styles.optionLetterCorrect,
                    isAnswered &&
                      selected &&
                      !correct &&
                      styles.optionLetterWrong,
                  ]}
                >
                  <Text
                    style={[
                      styles.optionLetterText,
                      isAnswered &&
                        (correct || selected) &&
                        styles.optionLetterTextActive,
                    ]}
                  >
                    {String.fromCharCode(65 + index)}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.optionText,
                    isAnswered &&
                      correct &&
                      styles.optionTextCorrect,
                    isAnswered &&
                      selected &&
                      !correct &&
                      styles.optionTextWrong,
                  ]}
                >
                  {option}
                </Text>

                {isAnswered && correct && (
                  <Ionicons
                    name="checkmark-circle"
                    size={22}
                    color={GREEN}
                  />
                )}

                {isAnswered &&
                  selected &&
                  !correct && (
                    <Ionicons
                      name="close-circle"
                      size={22}
                      color={RED}
                    />
                  )}
              </Pressable>
            );
          })}

          {isAnswered && (
            <View
              style={[
                styles.feedbackCard,
                isCorrect
                  ? styles.feedbackCorrect
                  : styles.feedbackWrong,
              ]}
            >
              <Ionicons
                name={
                  isCorrect
                    ? "checkmark-circle"
                    : "information-circle"
                }
                size={23}
                color={isCorrect ? GREEN : RED}
              />

              <View style={styles.feedbackContent}>
                <Text
                  style={[
                    styles.feedbackTitle,
                    {
                      color: isCorrect ? GREEN : RED,
                    },
                  ]}
                >
                  {isCorrect
                    ? "Correct answer!"
                    : "Not quite right"}
                </Text>

                <Text style={styles.feedbackText}>
                  {currentQuestion.explanation}
                </Text>
              </View>
            </View>
          )}

          <Pressable
            onPress={nextQuestion}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>
              {currentIndex === questions.length - 1
                ? "Finish Quiz"
                : "Next Question"}
            </Text>

            <Ionicons
              name={
                currentIndex === questions.length - 1
                  ? "checkmark"
                  : "arrow-forward"
              }
              size={20}
              color="#FFFFFF"
            />
          </Pressable>

          <View style={styles.bottomSpace} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color={DARK}
            />
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.title}>AI Quiz</Text>
            <Text style={styles.subtitle}>
              Test your knowledge
            </Text>
          </View>

          <View style={styles.aiIcon}>
            <Ionicons
              name="sparkles"
              size={21}
              color={PURPLE}
            />
          </View>
        </View>

        {/* Hero */}
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons
              name="school-outline"
              size={30}
              color={BLUE}
            />
          </View>

          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>
              Ready for a challenge?
            </Text>

            <Text style={styles.heroText}>
              Pick a subject and test yourself with 5
              multiple-choice questions.
            </Text>
          </View>
        </View>

        {/* Subject selection */}
        <Text style={styles.sectionTitle}>
          Select a subject
        </Text>

        <View style={styles.subjectList}>
          {SUBJECTS.map((subject) => {
            const selected = selectedSubject === subject;

            return (
              <Pressable
                key={subject}
                onPress={() => setSelectedSubject(subject)}
                style={[
                  styles.subjectCard,
                  selected &&
                    styles.subjectCardSelected,
                ]}
              >
                <View
                  style={[
                    styles.subjectIcon,
                    selected &&
                      styles.subjectIconSelected,
                  ]}
                >
                  <Ionicons
                    name={
                      subject === "Artificial Intelligence"
                        ? "sparkles-outline"
                        : "book-outline"
                    }
                    size={21}
                    color={
                      selected ? "#FFFFFF" : BLUE
                    }
                  />
                </View>

                <View style={styles.subjectInfo}>
                  <Text
                    style={[
                      styles.subjectName,
                      selected &&
                        styles.subjectNameSelected,
                    ]}
                  >
                    {subject}
                  </Text>

                  <Text
                    style={[
                      styles.subjectQuestions,
                      selected &&
                        styles.subjectQuestionsSelected,
                    ]}
                  >
                    5 questions
                  </Text>
                </View>

                <Ionicons
                  name={
                    selected
                      ? "checkmark-circle"
                      : "chevron-forward"
                  }
                  size={22}
                  color={
                    selected ? "#FFFFFF" : "#94A3B8"
                  }
                />
              </Pressable>
            );
          })}
        </View>

        {/* Quiz info */}
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Ionicons
              name="help-circle-outline"
              size={21}
              color={BLUE}
            />

            <Text style={styles.infoValue}>5</Text>
            <Text style={styles.infoLabel}>Questions</Text>
          </View>

          <View style={styles.infoItem}>
            <Ionicons
              name="time-outline"
              size={21}
              color={PURPLE}
            />

            <Text style={styles.infoValue}>~5</Text>
            <Text style={styles.infoLabel}>Minutes</Text>
          </View>

          <View style={styles.infoItem}>
            <Ionicons
              name="trophy-outline"
              size={21}
              color={ORANGE}
            />

            <Text style={styles.infoValue}>100%</Text>
            <Text style={styles.infoLabel}>Max score</Text>
          </View>
        </View>

        {/* Start */}
        <Pressable
          onPress={startQuiz}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.buttonPressed,
          ]}
        >
          <Ionicons
            name="play"
            size={20}
            color="#FFFFFF"
          />

          <Text style={styles.primaryButtonText}>
            Start Quiz
          </Text>
        </Pressable>

        {/* Tip */}
        <View style={styles.tipCard}>
          <Ionicons
            name="bulb-outline"
            size={23}
            color={ORANGE}
          />

          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>
              Quiz tip
            </Text>

            <Text style={styles.tipText}>
              Don't rush. Read every option carefully before
              choosing your answer.
            </Text>
          </View>
        </View>

        <View style={styles.bottomSpace} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG,
  },

  container: {
    flex: 1,
  },

  content: {
    padding: 16,
    paddingBottom: 30,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },

  quizHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 13,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 11,
    borderWidth: 1,
    borderColor: BORDER,
  },

  headerText: {
    flex: 1,
  },

  title: {
    fontSize: 22,
    fontWeight: "800",
    color: DARK,
  },

  subtitle: {
    marginTop: 2,
    fontSize: 13,
    color: MUTED,
  },

  aiIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#F3E8FF",
    justifyContent: "center",
    alignItems: "center",
  },

  heroCard: {
    backgroundColor: "#EEF4FF",
    borderRadius: 20,
    padding: 17,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
    borderWidth: 1,
    borderColor: "#DCE8FF",
  },

  heroIcon: {
    width: 55,
    height: 55,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 13,
  },

  heroContent: {
    flex: 1,
  },

  heroTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: DARK,
  },

  heroText: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: "#52647D",
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: TEXT,
    marginBottom: 11,
  },

  subjectList: {
    gap: 9,
  },

  subjectCard: {
    minHeight: 64,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  subjectCardSelected: {
    backgroundColor: BLUE,
    borderColor: BLUE,
  },

  subjectIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: "#EEF4FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 11,
  },

  subjectIconSelected: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },

  subjectInfo: {
    flex: 1,
  },

  subjectName: {
    fontSize: 13,
    fontWeight: "800",
    color: TEXT,
  },

  subjectNameSelected: {
    color: "#FFFFFF",
  },

  subjectQuestions: {
    fontSize: 10,
    color: MUTED,
    marginTop: 3,
  },

  subjectQuestionsSelected: {
    color: "#DCE8FF",
  },

  infoRow: {
    flexDirection: "row",
    gap: 9,
    marginTop: 18,
    marginBottom: 16,
  },

  infoItem: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    paddingVertical: 12,
  },

  infoValue: {
    fontSize: 15,
    fontWeight: "900",
    color: TEXT,
    marginTop: 4,
  },

  infoLabel: {
    fontSize: 9,
    color: MUTED,
    marginTop: 1,
  },

  primaryButton: {
    minHeight: 52,
    borderRadius: 15,
    backgroundColor: BLUE,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 9,
    marginTop: 7,
    marginBottom: 12,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  secondaryButton: {
    minHeight: 50,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CFE0F7",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },

  secondaryButtonText: {
    color: BLUE,
    fontSize: 13,
    fontWeight: "800",
  },

  buttonPressed: {
    opacity: 0.8,
  },

  tipCard: {
    backgroundColor: "#FFF9E8",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#FDE68A",
    marginTop: 5,
  },

  tipContent: {
    flex: 1,
    marginLeft: 10,
  },

  tipTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#92400E",
  },

  tipText: {
    fontSize: 11,
    lineHeight: 17,
    color: "#92400E",
    marginTop: 3,
  },

  bottomSpace: {
    height: 20,
  },

  questionCounter: {
    flex: 1,
    alignItems: "center",
  },

  questionCounterText: {
    fontSize: 13,
    fontWeight: "800",
    color: DARK,
  },

  scoreMini: {
    minWidth: 42,
    height: 36,
    paddingHorizontal: 9,
    borderRadius: 11,
    backgroundColor: "#FFF7E6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },

  scoreMiniText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#92400E",
  },

  progressTrack: {
    height: 7,
    borderRadius: 10,
    backgroundColor: "#E2E8F0",
    overflow: "hidden",
    marginBottom: 18,
  },

  progressFill: {
    height: "100%",
    backgroundColor: BLUE,
    borderRadius: 10,
  },

  subjectLabel: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EEF4FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9,
    marginBottom: 10,
  },

  subjectLabelText: {
    fontSize: 10,
    color: BLUE,
    fontWeight: "800",
  },

  questionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 19,
    marginBottom: 18,
  },

  questionBadge: {
    width: 40,
    height: 28,
    borderRadius: 9,
    backgroundColor: "#EEF4FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },

  questionBadgeText: {
    fontSize: 11,
    fontWeight: "900",
    color: BLUE,
  },

  questionText: {
    fontSize: 18,
    lineHeight: 27,
    fontWeight: "800",
    color: TEXT,
  },

  optionsLabel: {
    fontSize: 13,
    color: MUTED,
    fontWeight: "700",
    marginBottom: 9,
  },

  option: {
    minHeight: 58,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 15,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 9,
  },

  optionSelected: {
    minHeight: 58,
    backgroundColor: "#EEF4FF",
    borderWidth: 2,
    borderColor: BLUE,
    borderRadius: 15,
    padding: 9,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 9,
  },

  optionCorrect: {
    minHeight: 58,
    backgroundColor: "#F0FDF4",
    borderWidth: 2,
    borderColor: GREEN,
    borderRadius: 15,
    padding: 9,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 9,
  },

  optionWrong: {
    minHeight: 58,
    backgroundColor: "#FEF2F2",
    borderWidth: 2,
    borderColor: RED,
    borderRadius: 15,
    padding: 9,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 9,
  },

  optionLetter: {
    width: 35,
    height: 35,
    borderRadius: 11,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  optionLetterCorrect: {
    backgroundColor: GREEN,
  },

  optionLetterWrong: {
    backgroundColor: RED,
  },

  optionLetterText: {
    fontSize: 13,
    fontWeight: "900",
    color: MUTED,
  },

  optionLetterTextActive: {
    color: "#FFFFFF",
  },

  optionText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
    color: TEXT,
  },

  optionTextCorrect: {
    color: GREEN,
    fontWeight: "800",
  },

  optionTextWrong: {
    color: RED,
    fontWeight: "800",
  },

  feedbackCard: {
    borderRadius: 15,
    padding: 13,
    flexDirection: "row",
    marginTop: 5,
    marginBottom: 9,
    borderWidth: 1,
  },

  feedbackCorrect: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
  },

  feedbackWrong: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },

  feedbackContent: {
    flex: 1,
    marginLeft: 9,
  },

  feedbackTitle: {
    fontSize: 13,
    fontWeight: "900",
  },

  feedbackText: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 17,
    color: MUTED,
  },

  resultCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 25,
    alignItems: "center",
    marginBottom: 13,
  },

  resultIcon: {
    width: 78,
    height: 78,
    borderRadius: 25,
    backgroundColor: "#F3E8FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 13,
  },

  resultTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: DARK,
  },

  resultScore: {
    fontSize: 36,
    fontWeight: "900",
    color: BLUE,
    marginTop: 9,
  },

  resultPercentage: {
    fontSize: 16,
    fontWeight: "800",
    color: PURPLE,
    marginTop: 1,
  },

  resultMessage: {
    textAlign: "center",
    fontSize: 12,
    lineHeight: 18,
    color: MUTED,
    marginTop: 9,
  },

  resultStats: {
    flexDirection: "row",
    gap: 9,
    marginBottom: 22,
  },

  resultStat: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    paddingVertical: 12,
  },

  resultStatValue: {
    fontSize: 17,
    fontWeight: "900",
    color: TEXT,
    marginTop: 4,
  },

  resultStatLabel: {
    fontSize: 9,
    color: MUTED,
    marginTop: 2,
  },

  reviewTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: TEXT,
    marginBottom: 10,
  },

  reviewCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    marginBottom: 10,
  },

  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 9,
  },

  reviewNumber: {
    width: 30,
    height: 30,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },

  reviewCorrect: {
    backgroundColor: "#DCFCE7",
  },

  reviewWrong: {
    backgroundColor: "#FEE2E2",
  },

  reviewNumberText: {
    fontSize: 11,
    fontWeight: "900",
    color: TEXT,
  },

  reviewQuestion: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "800",
    color: TEXT,
  },

  yourAnswer: {
    fontSize: 11,
    color: MUTED,
    marginTop: 9,
  },

  correctAnswer: {
    fontSize: 11,
    color: GREEN,
    fontWeight: "700",
    marginTop: 4,
  },

  explanation: {
    fontSize: 11,
    lineHeight: 17,
    color: MUTED,
    marginTop: 9,
    backgroundColor: "#F8FAFC",
    padding: 9,
    borderRadius: 9,
  },
});