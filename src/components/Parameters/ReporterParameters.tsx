import { InfoOutlineIcon } from '@chakra-ui/icons'
import {
  Box,
  Flex,
  Heading,
  SimpleGrid,
  Skeleton,
  Text,
  Tooltip,
  useColorModeValue,
} from '@chakra-ui/react'
import { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { selectTmClient } from '@/store/connectSlice'
import { selectReporterParams, setReporterParams } from '@/store/paramsSlice'
import { queryReporterParams } from '@/rpc/abci'

export default function ReporterParameters() {
  const [isHidden, setIsHidden] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const dispatch = useDispatch()
  const tmClient = useSelector(selectTmClient)
  const params = useSelector(selectReporterParams)

  useEffect(() => {
    if (tmClient && !params && !isLoaded) {
      queryReporterParams(tmClient)
        .then((response) => {
          dispatch(setReporterParams(response))
          setIsLoaded(true)
        })
        .catch((err) => {
          console.error(err)
          setIsLoaded(true)
        })
    }

    if (params) {
      setIsLoaded(true)
    }
  }, [tmClient, params, isLoaded])

  const renderParams = (params: any) => {
    if (!params) return null
    return Object.entries(params).map(([key, value]) => (
      <Box key={key}>
        <Text fontWeight="medium" mb={1}>
          {key
            .replace(/([A-Z])/g, ' $1')
            .split(/(?=[A-Z])/)
            .join(' ')
            .replace(/^./, (str) => str.toUpperCase())}
        </Text>
        <Text>{value?.toString()}</Text>
      </Box>
    ))
  }

  return (
    <Box
      mt={6}
      bg={useColorModeValue('light-container', 'dark-container')}
      shadow={'base'}
      borderRadius={4}
      p={6}
      hidden={isHidden}
    >
      <Flex mb={8} alignItems={'center'} gap={2}>
        <Tooltip
          label="These are values of parameters for the reporter module."
          fontSize="sm"
        >
          <InfoOutlineIcon
            boxSize={5}
            justifyItems={'center'}
            color={useColorModeValue('light-theme', 'dark-theme')}
          />
        </Tooltip>
        <Heading size={'md'} fontWeight={'medium'}>
          Reporter Parameters
        </Heading>
      </Flex>
      {!isLoaded ? (
        <SimpleGrid minChildWidth="200px" spacing="40px" pl={4}>
          <Skeleton height="20px" />
          <Skeleton height="20px" />
          <Skeleton height="20px" />
        </SimpleGrid>
      ) : (
        <SimpleGrid minChildWidth="200px" spacing="40px" pl={4}>
          {renderParams(params)}
        </SimpleGrid>
      )}
    </Box>
  )
}
